const appHeader = document.getElementById("appHeader");
const versionList = document.getElementById("versionList");
const reviewList = document.getElementById("reviewList");
const reviewForm = document.getElementById("reviewForm");
const reportForm = document.getElementById("reportForm");

const params = new URLSearchParams(window.location.search);
const appId = params.get("id");
let isFavorited = false;

function requireAppId() {
  if (!appId) {
    appHeader.innerHTML = "<div class=\"empty\">Missing app id.</div>";
    throw new Error("Missing app id");
  }
}

async function loadApp() {
  const app = await api.get(`/apps/${appId}`);
  const isAuthed = auth.isLoggedIn();
  appHeader.innerHTML = `
    <h2 class="section-title">${escapeHtml(app.name)}</h2>
    <p>${escapeHtml(app.description || "")}</p>
    <div class="toolbar" style="margin-top: 12px;">
      <span class="badge">${app.status || "PUBLISHED"}</span>
      <button class="button" id="downloadBtn" ${!isAuthed ? "disabled" : ""}>Download</button>
      <button class="button secondary" id="favoriteBtn" ${!isAuthed ? "disabled" : ""}>${isFavorited ? "Unfavorite" : "Favorite"}</button>
    </div>
    ${!isAuthed ? `<p class="muted">Login to download or favorite this app.</p>` : ""}
  `;

  document.getElementById("downloadBtn").addEventListener("click", async () => {
    if (!auth.isLoggedIn()) {
      window.location.href = ui.pageUrl("pages/auth/login.html");
      return;
    }
    try {
      await api.post(`/apps/${appId}/download`, {});
      ui.toast("Download tracked", "success");
    } catch (err) {
      ui.toast(err.message || "Download failed", "error");
    }
  });

  document.getElementById("favoriteBtn").addEventListener("click", async () => {
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

async function loadVersions() {
  const data = await api.get(`/apps/${appId}/versions`);
  const items = data.items || data.versions || data.data || [];
  if (!items.length) return ui.renderEmpty(versionList, "No versions yet.");
  versionList.innerHTML = items.map(v => `
    <div class="card">
      <h3>${escapeHtml(v.version)}</h3>
      <p>${escapeHtml(v.changelog || "")}</p>
      <div class="toolbar" style="margin-top: 10px;">
        <span class="badge">${escapeHtml(v.fileSize || "")}</span>
        <span class="badge">${escapeHtml((v.supportedOs || []).join(", "))}</span>
      </div>
    </div>
  `).join("");
}

async function loadReviews() {
  const data = await api.get(`/apps/${appId}/reviews`);
  const items = data.items || data.reviews || data.data || [];
  if (!items.length) return ui.renderEmpty(reviewList, "No reviews yet.");
  reviewList.innerHTML = items.map(r => `
    <div class="card" style="margin-bottom: 12px;">
      <div class="toolbar" style="justify-content: space-between;">
        <strong>${escapeHtml(r.title || "Review")}</strong>
        <span class="badge">${r.rating}/5</span>
      </div>
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
