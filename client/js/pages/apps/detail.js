const appHeader = document.getElementById("appHeader");
const versionList = document.getElementById("versionList");
const reviewList = document.getElementById("reviewList");
const reviewSummary = document.getElementById("reviewSummary");
const reviewLoadMore = document.getElementById("reviewLoadMore");
const reviewForm = document.getElementById("reviewForm");
const reportForm = document.getElementById("reportForm");
const screenshotGrid = document.getElementById("screenshotGrid");

const params = new URLSearchParams(window.location.search);
const appId = params.get("id");
let isFavorited = false;
let latestVersion = null;
let currentApp = null;
let allReviews = [];
let renderedReviewCount = 0;

const REVIEW_BATCH_SIZE = 4;
const gradients = ["grad-a", "grad-b", "grad-c", "grad-d", "grad-e"];

const hash = (value) => {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) {
    out = (out << 5) - out + value.charCodeAt(i);
    out |= 0;
  }
  return Math.abs(out);
};

const initials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "APP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const pickGradient = (name) => gradients[hash(String(name || "")) % gradients.length];

const buildRedirectUrl = (versionId, includeToken = false) => {
  const base = CONFIG.API_BASE_URL.replace(/\/$/, "");
  const token = includeToken ? auth.getAccessToken() : null;
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
  return `${base}/apps/${appId}/download/redirect?versionId=${versionId}${tokenParam}`;
};

function requireAppId() {
  if (!appId) {
    appHeader.innerHTML = "<div class=\"empty\">Missing app id.</div>";
    throw new Error("Missing app id");
  }
}

function renderStars(value, max = 5) {
  const rating = Math.max(0, Math.min(max, Number(value) || 0));
  return Array.from({ length: max }, (_, index) => {
    const filled = index + 1 <= Math.round(rating);
    return `<span class="rating-star${filled ? " is-filled" : ""}">&#9733;</span>`;
  }).join("");
}

function formatReviewCount(count) {
  const total = Number(count) || 0;
  if (!total) return "No ratings yet";
  if (total === 1) return "1 review";
  return `${total} reviews`;
}

function buildReviewStats(items) {
  const counts = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: items.filter((item) => Number(item.rating) === score).length
  }));
  const total = items.length;
  const sum = items.reduce((acc, item) => acc + (Number(item.rating) || 0), 0);
  const average = total ? sum / total : 0;
  return { counts, total, average };
}

async function loadApp() {
  const app = await api.get(`/apps/${appId}`);
  currentApp = app;
  renderHeader();
  renderScreenshots();
}

function renderHeader() {
  if (!currentApp) return;

  const isAuthed = auth.isLoggedIn();
  const hasDownload = Boolean(latestVersion && (latestVersion.downloadUrl || latestVersion.downloadPublicId || latestVersion.storageKey || latestVersion.storageObjectUrl));
  const releaseDate = formatDate(latestVersion?.releaseDate || latestVersion?.createdAt);
  const stats = buildReviewStats(allReviews);
  const categoryName = currentApp.category?.name || "Utilities";
  const tagMarkup = Array.isArray(currentApp.tags) && currentApp.tags.length
    ? currentApp.tags.slice(0, 4).map((tag) => `<span class="badge">${escapeHtml(tag.name || tag.label || tag)}</span>`).join("")
    : `<span class="badge">${escapeHtml(categoryName)}</span>`;
  const iconMarkup = currentApp.iconUrl
    ? `<div class="app-icon lg has-image"><img src="${escapeHtml(ui.assetUrl(currentApp.iconUrl))}" alt="${escapeHtml(currentApp.name)} icon" loading="lazy" /></div>`
    : `<div class="app-icon lg ${pickGradient(currentApp.name)}">${escapeHtml(initials(currentApp.name))}</div>`;
  const bannerMarkup = currentApp.bannerUrl
    ? `<div class="app-banner"><img src="${escapeHtml(ui.assetUrl(currentApp.bannerUrl))}" alt="${escapeHtml(currentApp.name)} banner" loading="lazy" /></div>`
    : "";
  const description = currentApp.shortDescription || currentApp.description || "No description provided yet.";
  const versionLabel = latestVersion?.version ? escapeHtml(latestVersion.version) : "Coming soon";
  const downloadLabel = latestVersion?.version ? `Install ${escapeHtml(latestVersion.version)}` : "Install";
  const sizeLabel = latestVersion?.fileSize ? escapeHtml(latestVersion.fileSize) : "Size unavailable";
  const updatedLabel = releaseDate || "Update date unavailable";

  appHeader.innerHTML = `
    ${bannerMarkup}
    <div class="app-detail-header">
      <div class="app-detail-main">
        ${iconMarkup}
        <div class="app-detail-copy-block">
          <div class="app-detail-labels">
            <span class="hero-pill">${escapeHtml(categoryName)}</span>
            <span class="badge">${escapeHtml(currentApp.status || "PUBLISHED")}</span>
          </div>
          <h2 class="section-title">${escapeHtml(currentApp.name)}</h2>
          <p class="app-detail-description">${escapeHtml(description)}</p>
          <div class="app-detail-tags">${tagMarkup}</div>
        </div>
      </div>
      <div class="app-detail-actions">
        <button class="button" id="downloadBtn" ${!hasDownload ? "disabled" : ""}>${downloadLabel}</button>
        <button class="button secondary" id="linkBtn" ${!hasDownload ? "disabled" : ""}>Get share link</button>
        <button class="button ghost" id="favoriteBtn" ${!isAuthed ? "disabled" : ""}>${isFavorited ? "Unsave" : "Save"}</button>
        ${!isAuthed ? `<p class="muted">Login to install, save, or review this app.</p>` : ""}
      </div>
    </div>
    <div class="app-detail-metrics">
      <div class="detail-metric">
        <strong>${stats.average ? stats.average.toFixed(1) : "New"}</strong>
        <span>Rating</span>
        <div class="rating-stars" aria-hidden="true">${renderStars(stats.average)}</div>
        <small>${formatReviewCount(stats.total)}</small>
      </div>
      <div class="detail-metric">
        <strong>${versionLabel}</strong>
        <span>Current version</span>
        <small>${sizeLabel}</small>
      </div>
      <div class="detail-metric">
        <strong>${updatedLabel}</strong>
        <span>Updated</span>
        <small>${hasDownload ? "Ready to install" : "Awaiting release file"}</small>
      </div>
    </div>
  `;
  appHeader.removeAttribute("aria-busy");

  const downloadBtn = document.getElementById("downloadBtn");
  const linkBtn = document.getElementById("linkBtn");
  const favoriteBtn = document.getElementById("favoriteBtn");

  if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {
      if (!latestVersion) {
        ui.toast("No download available", "error");
        return;
      }
      if (!auth.isLoggedIn()) {
        window.location.href = ui.pageUrl("pages/auth/login.html");
        return;
      }
      try {
        window.location.href = buildRedirectUrl(latestVersion.id, true);
      } catch (err) {
        ui.toast(err.message || "Download failed", "error");
      }
    });
  }

  if (linkBtn) {
    linkBtn.addEventListener("click", async () => {
      if (!latestVersion) {
        ui.toast("No download link available", "error");
        return;
      }
      const redirectUrl = buildRedirectUrl(latestVersion.id, false);
      const copied = await copyToClipboard(redirectUrl);
      if (copied) {
        ui.toast("Download link copied", "success");
        return;
      }
      window.open(redirectUrl, "_blank", "noopener");
    });
  }

  if (favoriteBtn) {
    favoriteBtn.addEventListener("click", async () => {
      if (!auth.isLoggedIn()) {
        window.location.href = ui.pageUrl("pages/auth/login.html");
        return;
      }
      try {
        if (!isFavorited) {
          await api.post(`/apps/${appId}/favorite`, {});
          isFavorited = true;
        } else {
          await api.del(`/apps/${appId}/favorite`);
          isFavorited = false;
        }
        renderHeader();
      } catch (err) {
        if (err.status === 409) {
          isFavorited = true;
          renderHeader();
          return;
        }
        ui.toast(err.message || "Favorite failed", "error");
      }
    });
  }
}

function renderScreenshots() {
  if (!screenshotGrid) return;
  const items = Array.isArray(currentApp?.screenshots) ? currentApp.screenshots : [];

  if (!items.length) {
    screenshotGrid.removeAttribute("aria-busy");
    return ui.renderEmpty(screenshotGrid, "No screenshots uploaded yet.");
  }

  const slides = items.map((url, index) => `
    <article class="screenshot-slide${index === 0 ? " is-active" : ""}" data-index="${index}">
      <div class="screenshot-card">
        <img src="${escapeHtml(ui.assetUrl(url))}" alt="${escapeHtml(currentApp?.name || "App")} screenshot ${index + 1}" loading="lazy" />
      </div>
    </article>
  `).join("");

  const dots = items.map((_, index) => `
    <button class="screenshot-dot${index === 0 ? " is-active" : ""}" type="button" data-slide="${index}" aria-label="Show screenshot ${index + 1}"></button>
  `).join("");

  screenshotGrid.innerHTML = `
    <div class="screenshot-carousel-head">
      <p class="hero-label">Preview flow</p>
      <div class="screenshot-carousel-actions">
        <button class="button ghost screenshot-nav" type="button" data-direction="prev" aria-label="Previous screenshot">Prev</button>
        <button class="button ghost screenshot-nav" type="button" data-direction="next" aria-label="Next screenshot">Next</button>
      </div>
    </div>
    <div class="screenshot-viewport" id="screenshotViewport">${slides}</div>
    <div class="screenshot-dots" aria-label="Screenshot navigation">${dots}</div>
  `;
  screenshotGrid.removeAttribute("aria-busy");

  const viewport = document.getElementById("screenshotViewport");
  const navButtons = screenshotGrid.querySelectorAll(".screenshot-nav");
  const dotButtons = screenshotGrid.querySelectorAll(".screenshot-dot");
  const slideItems = screenshotGrid.querySelectorAll(".screenshot-slide");
  const slideCount = items.length;
  let activeIndex = 0;

  const updateActiveSlide = (nextIndex) => {
    activeIndex = (nextIndex + slideCount) % slideCount;
    slideItems.forEach((slide, index) => slide.classList.toggle("is-active", index === activeIndex));
    dotButtons.forEach((dot, index) => dot.classList.toggle("is-active", index === activeIndex));
  };

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.direction === "next" ? 1 : -1;
      updateActiveSlide(activeIndex + direction);
    });
  });

  dotButtons.forEach((dot) => {
    dot.addEventListener("click", () => {
      updateActiveSlide(Number(dot.dataset.slide) || 0);
    });
  });

  viewport.setAttribute("aria-live", "polite");
  updateActiveSlide(0);
}

async function loadVersions() {
  const data = await api.get(`/apps/${appId}/versions`);
  const items = Array.isArray(data) ? data : (data.items || data.versions || data.data || []);
  const sorted = [...items].sort((a, b) => {
    const aDate = new Date(a.releaseDate || a.createdAt || 0).getTime();
    const bDate = new Date(b.releaseDate || b.createdAt || 0).getTime();
    return bDate - aDate;
  });

  latestVersion = sorted[0] || null;
  renderHeader();

  if (!sorted.length) {
    versionList.removeAttribute("aria-busy");
    return ui.renderEmpty(versionList, "No versions yet.");
  }

  versionList.innerHTML = sorted.map((version, index) => {
    const hasDownload = Boolean(version.downloadUrl || version.downloadPublicId || version.storageKey || version.storageObjectUrl);
    const supportedOs = Array.isArray(version.supportedOs) && version.supportedOs.length ? version.supportedOs.join(", ") : "All platforms";

    return `
      <div class="card version-card">
        <div class="version-card-head">
          <div>
            <p class="hero-label">${index === 0 ? "Latest release" : "Previous release"}</p>
            <h3>${escapeHtml(version.version)}</h3>
          </div>
          <span class="badge">${escapeHtml(version.fileSize || "File size pending")}</span>
        </div>
        <p>${escapeHtml(version.changelog || "No changelog added for this release.")}</p>
        <div class="version-meta">
          <span class="badge">${escapeHtml(supportedOs)}</span>
          <span class="badge">${escapeHtml(formatDate(version.releaseDate || version.createdAt) || "Date pending")}</span>
        </div>
        <div class="toolbar">
          ${hasDownload ? `<button class="button secondary" data-download="${version.id}">Download ZIP</button>` : ""}
          ${hasDownload ? `<button class="button ghost" data-copy="${version.id}">Copy link</button>` : ""}
        </div>
      </div>
    `;
  }).join("");
  versionList.removeAttribute("aria-busy");

  versionList.querySelectorAll("button[data-download]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const versionId = btn.dataset.download;
      const match = sorted.find((item) => String(item.id) === String(versionId));
      if (!match) {
        ui.toast("Download unavailable", "error");
        return;
      }
      if (!auth.isLoggedIn()) {
        window.location.href = ui.pageUrl("pages/auth/login.html");
        return;
      }
      try {
        window.location.href = buildRedirectUrl(match.id, true);
      } catch (err) {
        ui.toast(err.message || "Download failed", "error");
      }
    });
  });

  versionList.querySelectorAll("button[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const versionId = btn.dataset.copy;
      if (!versionId) return;
      const redirectUrl = buildRedirectUrl(versionId, false);
      const copied = await copyToClipboard(redirectUrl);
      if (copied) {
        ui.toast("Download link copied", "success");
        return;
      }
      window.open(redirectUrl, "_blank", "noopener");
    });
  });
}

function renderReviewSummary() {
  if (!reviewSummary) return;

  const { average, total, counts } = buildReviewStats(allReviews);
  const rows = counts.map(({ score, count }) => {
    const width = total ? Math.round((count / total) * 100) : 0;
    return `
      <div class="review-breakdown-row">
        <span>${score}</span>
        <div class="review-breakdown-bar"><span style="width: ${width}%"></span></div>
        <strong>${count}</strong>
      </div>
    `;
  }).join("");

  reviewSummary.innerHTML = `
    <div class="review-summary-top">
      <div>
        <p class="hero-label">User rating</p>
        <div class="review-score">${total ? average.toFixed(1) : "0.0"}</div>
        <div class="rating-stars review-stars-lg" aria-hidden="true">${renderStars(average)}</div>
        <p class="muted">${formatReviewCount(total)}</p>
      </div>
      <div class="review-summary-copy">
        <h3>What people are saying</h3>
        <p>Recent feedback appears first, and more reviews load in batches to keep the page clean and easy to browse.</p>
      </div>
    </div>
    <div class="review-breakdown">${rows}</div>
  `;
  reviewSummary.removeAttribute("aria-busy");
}

function bindReviewActions() {
  reviewList.querySelectorAll("button[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api.del(`/apps/${appId}/reviews/${btn.dataset.delete}`);
        ui.toast("Review deleted", "success");
        loadReviews();
      } catch (err) {
        ui.toast(err.message || "Delete failed", "error");
      }
    });
  });

  reviewList.querySelectorAll("button[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const reviewId = btn.dataset.edit;
      const rating = prompt("Rating (1-5):");
      const title = prompt("Title:");
      const comment = prompt("Comment:");

      try {
        await api.patch(`/apps/${appId}/reviews/${reviewId}`, { rating, title, comment });
        ui.toast("Review updated", "success");
        loadReviews();
      } catch (err) {
        ui.toast(err.message || "Update failed", "error");
      }
    });
  });
}

function renderReviewCards() {
  if (!reviewList) return;

  if (!allReviews.length) {
    reviewList.removeAttribute("aria-busy");
    reviewLoadMore?.classList.add("hidden");
    return ui.renderEmpty(reviewList, "No reviews yet.");
  }

  const visibleItems = allReviews.slice(0, renderedReviewCount);
  reviewList.innerHTML = visibleItems.map((review) => `
    <article class="card review-card">
      <div class="review-card-head">
        <div>
          <h3>${escapeHtml(review.title || "User review")}</h3>
          <p class="muted">${escapeHtml(review.user?.name || "Anonymous")} - ${escapeHtml(formatDate(review.createdAt) || "Recently posted")}</p>
        </div>
        <div class="review-rating-badge">
          <div class="rating-stars" aria-hidden="true">${renderStars(review.rating)}</div>
          <span>${escapeHtml(String(review.rating || 0))}/5</span>
        </div>
      </div>
      <p>${escapeHtml(review.comment || "No written comment provided.")}</p>
      ${auth.isLoggedIn() ? `
        <div class="toolbar">
          <button class="button ghost" data-edit="${review.id}">Edit</button>
          <button class="button danger" data-delete="${review.id}">Delete</button>
        </div>
      ` : ""}
    </article>
  `).join("");
  reviewList.removeAttribute("aria-busy");
  bindReviewActions();

  if (reviewLoadMore) {
    const hasMore = renderedReviewCount < allReviews.length;
    reviewLoadMore.classList.toggle("hidden", !hasMore);
    reviewLoadMore.textContent = hasMore ? `Load more reviews (${allReviews.length - renderedReviewCount} left)` : "All reviews loaded";
  }
}

async function loadReviews() {
  const data = await api.get(`/apps/${appId}/reviews`);
  const items = Array.isArray(data) ? data : (data.items || data.reviews || data.data || []);

  allReviews = [...items].sort((a, b) => {
    const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();
    return bTime - aTime;
  });
  renderedReviewCount = Math.min(REVIEW_BATCH_SIZE, allReviews.length);

  renderReviewSummary();
  renderReviewCards();
  renderHeader();
}

reviewLoadMore?.addEventListener("click", () => {
  renderedReviewCount = Math.min(renderedReviewCount + REVIEW_BATCH_SIZE, allReviews.length);
  renderReviewCards();
});

reviewForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!auth.isLoggedIn()) {
    window.location.href = ui.pageUrl("pages/auth/login.html");
    return;
  }

  const data = Object.fromEntries(new FormData(reviewForm));
  const btn = reviewForm.querySelector("button");
  ui.setLoading(btn, true);

  try {
    await api.post(`/apps/${appId}/reviews`, data);
    ui.toast("Review submitted", "success");
    reviewForm.reset();
    loadReviews();
  } catch (err) {
    ui.toast(err.message || "Review failed", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});

reportForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!auth.isLoggedIn()) {
    window.location.href = ui.pageUrl("pages/auth/login.html");
    return;
  }

  const data = Object.fromEntries(new FormData(reportForm));
  const btn = reportForm.querySelector("button");
  ui.setLoading(btn, true);

  try {
    await api.post("/reports", { type: "APP", targetId: Number(appId), ...data });
    ui.toast("Report submitted", "success");
    reportForm.reset();
  } catch (err) {
    ui.toast(err.message || "Report failed", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});

async function loadFavoritesState() {
  if (!auth.isLoggedIn()) return;
  try {
    const data = await api.get("/users/me/favorites");
    const items = data.items || data.favorites || data.data || [];
    isFavorited = items.some((item) => String(item.appId || item.id) === String(appId));
  } catch {}
}

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(String(text));
      return true;
    }
  } catch {}
  return false;
}

(async () => {
  try {
    requireAppId();
    if (!auth.isLoggedIn()) {
      reviewForm.closest(".card")?.insertAdjacentHTML("beforebegin", "<div class=\"empty\">Login to post a review.</div>");
      reportForm.closest(".card")?.insertAdjacentHTML("beforebegin", "<div class=\"empty\">Login to report this app.</div>");
      reviewForm.closest(".card")?.classList.add("hidden");
      reportForm.closest(".card")?.classList.add("hidden");
    }
    await loadFavoritesState();
    await Promise.all([loadApp(), loadVersions(), loadReviews()]);
  } catch (err) {
    ui.toast(err.message || "Failed to load app", "error");
  }
})();
