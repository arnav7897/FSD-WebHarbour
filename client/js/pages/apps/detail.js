const appHeader = document.getElementById("appHeader");
const versionList = document.getElementById("versionList");
const reviewList = document.getElementById("reviewList");
const reviewForm = document.getElementById("reviewForm");
const reportForm = document.getElementById("reportForm");
const screenshotGrid = document.getElementById("screenshotGrid");

const params = new URLSearchParams(window.location.search);
const appId = params.get("id");
let isFavorited = false;
let latestVersion = null;
let currentApp = null;

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
  const downloadLabel = latestVersion?.version ? `Download ${escapeHtml(latestVersion.version)}` : "Download";
  const sizeLabel = latestVersion?.fileSize ? ` · ${escapeHtml(latestVersion.fileSize)}` : "";
  const releaseDate = formatDate(latestVersion?.releaseDate || latestVersion?.createdAt);
  const versionMeta = latestVersion
    ? `<p class="muted">Latest release: ${escapeHtml(latestVersion.version)}${sizeLabel}${releaseDate ? ` · ${releaseDate}` : ""}</p>`
    : `<p class="muted">No downloadable version yet.</p>`;

  const iconMarkup = currentApp.iconUrl
    ? `<div class="app-icon lg has-image"><img src="${escapeHtml(ui.assetUrl(currentApp.iconUrl))}" alt="${escapeHtml(currentApp.name)} icon" loading="lazy" /></div>`
    : `<div class="app-icon lg ${pickGradient(currentApp.name)}">${escapeHtml(initials(currentApp.name))}</div>`;

  const bannerMarkup = currentApp.bannerUrl
    ? `<div class="app-banner"><img src="${escapeHtml(ui.assetUrl(currentApp.bannerUrl))}" alt="${escapeHtml(currentApp.name)} banner" loading="lazy" /></div>`
    : "";

  appHeader.innerHTML = `
    ${bannerMarkup}
    <div class="app-header">
      ${iconMarkup}
      <div>
        <h2 class="section-title">${escapeHtml(currentApp.name)}</h2>
        <p>${escapeHtml(currentApp.description || "")}</p>
        ${versionMeta}
      </div>
    </div>
    <div class="toolbar" style="margin-top: 12px;">
      <span class="badge">${currentApp.status || "PUBLISHED"}</span>
      <button class="button" id="downloadBtn" ${!hasDownload || !isAuthed ? "disabled" : ""}>${downloadLabel}</button>
      <button class="button secondary" id="linkBtn" ${!hasDownload ? "disabled" : ""}>Get link</button>
      <button class="button ghost" id="favoriteBtn" ${!isAuthed ? "disabled" : ""}>${isFavorited ? "Unfavorite" : "Favorite"}</button>
    </div>
    ${!isAuthed ? `<p class="muted">Login to track downloads or favorite this app.</p>` : ""}
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
        loadApp();
      } catch (err) {
        if (err.status === 409) {
          isFavorited = true;
          loadApp();
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
  screenshotGrid.innerHTML = items.map((url, index) => `
    <div class="screenshot-card">
      <img src="${escapeHtml(ui.assetUrl(url))}" alt="${escapeHtml(currentApp?.name || "App")} screenshot ${index + 1}" loading="lazy" />
    </div>
  `).join("");
  screenshotGrid.removeAttribute("aria-busy");
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
  versionList.innerHTML = sorted.map(v => {
    const hasDownload = Boolean(v.downloadUrl || v.downloadPublicId || v.storageKey || v.storageObjectUrl);
    return `
    <div class="card">
      <div class="split-row">
        <div>
          <h3>${escapeHtml(v.version)}</h3>
          <p>${escapeHtml(v.changelog || "")}</p>
        </div>
        <span class="badge">${escapeHtml(v.fileSize || "")}</span>
      </div>
      <div class="toolbar" style="margin-top: 10px;">
        <span class="badge">${escapeHtml((v.supportedOs || []).join(", "))}</span>
        ${hasDownload ? `<button class="button secondary" data-download="${v.id}">Download ZIP</button>` : ""}
        ${hasDownload ? `<button class="button ghost" data-copy="${v.id}">Copy link</button>` : ""}
      </div>
    </div>
  `;
  }).join("");
  versionList.removeAttribute("aria-busy");

  versionList.querySelectorAll("button[data-download]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const versionId = btn.dataset.download;
      const match = sorted.find(item => String(item.id) === String(versionId));
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

  versionList.querySelectorAll("button[data-copy]").forEach(btn => {
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

async function loadReviews() {
  const data = await api.get(`/apps/${appId}/reviews`);
  const items = Array.isArray(data) ? data : (data.items || data.reviews || data.data || []);
  if (!items.length) {
    reviewList.removeAttribute("aria-busy");
    return ui.renderEmpty(reviewList, "No reviews yet.");
  }
  reviewList.innerHTML = items.map(r => `
    <div class="card" style="margin-bottom: 12px;">
      <div class="toolbar" style="justify-content: space-between;">
        <strong>${escapeHtml(r.title || "Review")}</strong>
        <span class="badge">${r.rating}/5</span>
      </div>
      ${r.user?.name ? `<p class="muted">by ${escapeHtml(r.user.name)}</p>` : ""}
      <p>${escapeHtml(r.comment || "")}</p>
      <div class="toolbar">
        <button class="button ghost" data-edit="${r.id}">Edit</button>
        <button class="button danger" data-delete="${r.id}">Delete</button>
      </div>
    </div>
  `).join("");
  reviewList.removeAttribute("aria-busy");

  reviewList.querySelectorAll("button[data-delete]").forEach(btn => {
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

  reviewList.querySelectorAll("button[data-edit]").forEach(btn => {
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

reviewForm.addEventListener("submit", async (e) => {
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

reportForm.addEventListener("submit", async (e) => {
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
    isFavorited = items.some(i => String(i.appId || i.id) === String(appId));
  } catch {}
}

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
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
    await loadApp();
    await loadVersions();
    await loadReviews();
  } catch (err) {
    ui.toast(err.message || "Failed to load app", "error");
  }
})();
