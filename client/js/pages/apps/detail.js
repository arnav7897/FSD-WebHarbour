const appHeader = document.getElementById("appHeader");
const versionList = document.getElementById("versionList");
const reviewList = document.getElementById("reviewList");
const reviewForm = document.getElementById("reviewForm");
const reportForm = document.getElementById("reportForm");

const params = new URLSearchParams(window.location.search);
const appId = params.get("id");
let isFavorited = false;
let latestVersion = null;
let currentApp = null;

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
}

function renderHeader() {
  if (!currentApp) return;
  const isAuthed = auth.isLoggedIn();
  const hasDownload = Boolean(latestVersion && latestVersion.downloadUrl);
  const downloadLabel = latestVersion?.version ? `Download ${escapeHtml(latestVersion.version)}` : "Download";
  const sizeLabel = latestVersion?.fileSize ? ` · ${escapeHtml(latestVersion.fileSize)}` : "";
  const releaseDate = formatDate(latestVersion?.releaseDate || latestVersion?.createdAt);
  const versionMeta = latestVersion
    ? `<p class="muted">Latest release: ${escapeHtml(latestVersion.version)}${sizeLabel}${releaseDate ? ` · ${releaseDate}` : ""}</p>`
    : `<p class="muted">No downloadable version yet.</p>`;

  appHeader.innerHTML = `
    <h2 class="section-title">${escapeHtml(currentApp.name)}</h2>
    <p>${escapeHtml(currentApp.description || "")}</p>
    ${versionMeta}
    <div class="toolbar" style="margin-top: 12px;">
      <span class="badge">${currentApp.status || "PUBLISHED"}</span>
      <button class="button" id="downloadBtn" ${!hasDownload || !isAuthed ? "disabled" : ""}>${downloadLabel}</button>
      <button class="button secondary" id="linkBtn" ${!hasDownload ? "disabled" : ""}>Get link</button>
      <button class="button ghost" id="favoriteBtn" ${!isAuthed ? "disabled" : ""}>${isFavorited ? "Unfavorite" : "Favorite"}</button>
    </div>
    ${!isAuthed ? `<p class="muted">Login to track downloads or favorite this app.</p>` : ""}
  `;

  const downloadBtn = document.getElementById("downloadBtn");
  const linkBtn = document.getElementById("linkBtn");
  const favoriteBtn = document.getElementById("favoriteBtn");

  if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {
      if (!latestVersion?.downloadUrl) {
        ui.toast("No download available", "error");
        return;
      }
      if (!auth.isLoggedIn()) {
        window.location.href = ui.pageUrl("pages/auth/login.html");
        return;
      }
      try {
        const token = auth.getAccessToken();
        const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
        window.location.href = `${CONFIG.API_BASE_URL.replace(/\/$/, "")}/apps/${appId}/download/redirect?versionId=${latestVersion.id}${tokenParam}`;
      } catch (err) {
        ui.toast(err.message || "Download failed", "error");
      }
    });
  }

  if (linkBtn) {
    linkBtn.addEventListener("click", async () => {
      if (!latestVersion?.downloadUrl) {
        ui.toast("No download link available", "error");
        return;
      }
      const copied = await copyToClipboard(latestVersion.downloadUrl);
      if (copied) {
        ui.toast("Download link copied", "success");
        return;
      }
      window.open(latestVersion.downloadUrl, "_blank", "noopener");
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
  if (!sorted.length) return ui.renderEmpty(versionList, "No versions yet.");
  versionList.innerHTML = sorted.map(v => `
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
        ${v.downloadUrl ? `<button class="button secondary" data-download="${v.id}">Download APK</button>` : ""}
        ${v.downloadUrl ? `<button class="button ghost" data-copy="${v.id}" data-url="${escapeHtml(v.downloadUrl)}">Copy link</button>` : ""}
      </div>
    </div>
  `).join("");

  versionList.querySelectorAll("button[data-download]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const versionId = btn.dataset.download;
      const match = sorted.find(item => String(item.id) === String(versionId));
      if (!match?.downloadUrl) {
        ui.toast("Download unavailable", "error");
        return;
      }
      if (!auth.isLoggedIn()) {
        window.location.href = ui.pageUrl("pages/auth/login.html");
        return;
      }
      try {
        const token = auth.getAccessToken();
        const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
        window.location.href = `${CONFIG.API_BASE_URL.replace(/\/$/, "")}/apps/${appId}/download/redirect?versionId=${match.id}${tokenParam}`;
      } catch (err) {
        ui.toast(err.message || "Download failed", "error");
      }
    });
  });

  versionList.querySelectorAll("button[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const url = btn.dataset.url;
      if (!url) return;
      const copied = await copyToClipboard(url);
      if (copied) {
        ui.toast("Download link copied", "success");
        return;
      }
      window.open(url, "_blank", "noopener");
    });
  });
}

async function loadReviews() {
  const data = await api.get(`/apps/${appId}/reviews`);
  const items = Array.isArray(data) ? data : (data.items || data.reviews || data.data || []);
  if (!items.length) return ui.renderEmpty(reviewList, "No reviews yet.");
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
