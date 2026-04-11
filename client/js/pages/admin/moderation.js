/* ──────────────────────────────────────────────
   Admin Moderation Page
   Manages developer requests, app reviews, and
   published/suspended app enforcement actions.
   ────────────────────────────────────────────── */

const reviewGrid = document.getElementById("reviewGrid");
const liveGrid = document.getElementById("liveGrid");
const developerRequests = document.getElementById("developerRequests");

// ── Shared helpers ──────────────────────────────

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

function extractItems(data) {
  return data.items || data.apps || data.requests || data.data || [];
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// ── Developer Requests ──────────────────────────

async function loadDeveloperRequests() {
  if (!developerRequests) return;
  ui.renderCardSkeletons(developerRequests, 3);

  const data = await api.get("/admin/developers/requests?status=PENDING&limit=20");
  const items = extractItems(data);

  if (!items.length) return ui.renderEmpty(developerRequests, "No pending developer requests.");

  developerRequests.innerHTML = items.map(req => `
    <div class="card">
      <div class="split-row">
        <div>
          <h3>${escapeHtml(req.user?.name || "User")}</h3>
          <p class="muted">${escapeHtml(req.user?.email || "")}</p>
        </div>
        <span class="badge">Requested ${formatDate(req.verificationRequestedAt)}</span>
      </div>
      <div class="toolbar" style="margin-top: 12px;">
        <button class="button" data-approve-dev="${req.userId}">Approve</button>
        <button class="button danger" data-reject-dev="${req.userId}">Reject</button>
      </div>
    </div>
  `).join("");

  // Approve developer
  developerRequests.querySelectorAll("button[data-approve-dev]").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await api.patch(`/admin/developers/${btn.dataset.approveDev}/approve`, {});
        ui.toast("Developer approved", "success");
        loadDeveloperRequests();
      } catch (err) {
        ui.toast(err.message || "Approve failed", "error");
        btn.disabled = false;
      }
    });
  });

  // Reject developer
  developerRequests.querySelectorAll("button[data-reject-dev]").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await api.patch(`/admin/developers/${btn.dataset.rejectDev}/reject`, {});
        ui.toast("Developer request rejected", "success");
        loadDeveloperRequests();
      } catch (err) {
        ui.toast(err.message || "Reject failed", "error");
        btn.disabled = false;
      }
    });
  });
}

// ── Apps Under Review ───────────────────────────

async function loadReviewApps() {
  ui.renderCardSkeletons(reviewGrid, 3);

  const data = await api.get("/apps?status=UNDER_REVIEW&limit=20");
  const items = extractItems(data);

  if (!items.length) return ui.renderEmpty(reviewGrid, "No apps under review.");

  reviewGrid.innerHTML = items.map(app => `
    <div class="card">
      <h3>${escapeHtml(app.name)}</h3>
      <p>${escapeHtml(app.shortDescription || app.description || "")}</p>
      <div class="toolbar" style="margin-top: 12px;">
        <span class="badge">${escapeHtml(app.category?.name || "")}</span>
        <button class="button" data-approve="${app.id}">Approve</button>
        <button class="button danger" data-reject="${app.id}">Reject</button>
      </div>
    </div>
  `).join("");

  // Approve app
  reviewGrid.querySelectorAll("button[data-approve]").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await api.patch(`/admin/apps/${btn.dataset.approve}/approve`, {});
        ui.toast("App approved and published", "success");
        loadReviewApps();
      } catch (err) {
        ui.toast(err.message || "Approve failed", "error");
        btn.disabled = false;
      }
    });
  });

  // Reject app
  reviewGrid.querySelectorAll("button[data-reject]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const moderationNote = prompt("Reason for rejection:");
      if (!moderationNote) return;
      btn.disabled = true;
      try {
        await api.patch(`/admin/apps/${btn.dataset.reject}/reject`, { moderationNote });
        ui.toast("App rejected", "success");
        loadReviewApps();
      } catch (err) {
        ui.toast(err.message || "Reject failed", "error");
        btn.disabled = false;
      }
    });
  });
}

// ── Published / Suspended Apps ──────────────────

async function loadLiveApps() {
  ui.renderCardSkeletons(liveGrid, 3);

  // Fetch published and suspended apps in parallel
  const [pubData, susData] = await Promise.all([
    api.get("/apps?status=PUBLISHED&limit=20"),
    api.get("/apps?status=SUSPENDED&limit=20")
  ]);

  const all = extractItems(pubData).concat(extractItems(susData));

  if (!all.length) return ui.renderEmpty(liveGrid, "No apps to moderate.");

  liveGrid.innerHTML = all.map(app => {
    const isSuspended = app.status === "SUSPENDED";
    return `
      <div class="card">
        <h3>${escapeHtml(app.name)}</h3>
        <p>${escapeHtml(app.shortDescription || app.description || "")}</p>
        <div class="toolbar" style="margin-top: 12px;">
          <span class="badge ${isSuspended ? "badge-warn" : ""}">${app.status}</span>
          ${isSuspended
            ? `<button class="button" data-unsuspend="${app.id}">Unsuspend</button>`
            : `<button class="button warn" data-suspend="${app.id}">Suspend</button>`}
        </div>
      </div>
    `;
  }).join("");

  // Suspend app
  liveGrid.querySelectorAll("button[data-suspend]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const reason = prompt("Suspension reason:");
      if (!reason) return;
      btn.disabled = true;
      try {
        await api.patch(`/admin/apps/${btn.dataset.suspend}/suspend`, { reason });
        ui.toast("App suspended", "success");
        loadLiveApps();
      } catch (err) {
        ui.toast(err.message || "Suspend failed", "error");
        btn.disabled = false;
      }
    });
  });

  // Unsuspend app
  liveGrid.querySelectorAll("button[data-unsuspend]").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await api.patch(`/admin/apps/${btn.dataset.unsuspend}/unsuspend`, {});
        ui.toast("App restored to published", "success");
        loadLiveApps();
      } catch (err) {
        ui.toast(err.message || "Unsuspend failed", "error");
        btn.disabled = false;
      }
    });
  });
}

// ── Page Init ───────────────────────────────────

(async () => {
  try {
    if (window.__roleDenied) return;
    // Load all three sections in parallel for faster page load
    await Promise.all([
      loadDeveloperRequests(),
      loadReviewApps(),
      loadLiveApps()
    ]);
  } catch (err) {
    ui.toast(err.message || "Failed to load moderation panel", "error");
  }
})();
