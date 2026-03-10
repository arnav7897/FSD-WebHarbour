const reviewGrid = document.getElementById("reviewGrid");
const liveGrid = document.getElementById("liveGrid");
const developerRequests = document.getElementById("developerRequests");

async function loadDeveloperRequests() {
  if (!developerRequests) return;
  const data = await api.get("/admin/developers/requests?status=PENDING&limit=20");
  const items = data.items || data.requests || data.data || [];
  if (!items.length) return ui.renderEmpty(developerRequests, "No pending developer requests.");
  developerRequests.innerHTML = items.map(req => `
    <div class="card">
      <h3>${escapeHtml(req.user?.name || "User")}</h3>
      <p>${escapeHtml(req.user?.email || "")}</p>
      <div class="toolbar" style="margin-top: 12px;">
        <span class="badge">Requested</span>
        <button class="button" data-approve-dev="${req.userId}">Approve</button>
        <button class="button danger" data-reject-dev="${req.userId}">Reject</button>
      </div>
    </div>
  `).join("");

  developerRequests.querySelectorAll("button[data-approve-dev]").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await api.patch(`/admin/developers/${btn.dataset.approveDev}/approve`, {});
        ui.toast("Developer approved", "success");
        loadDeveloperRequests();
      } catch (err) {
        ui.toast(err.message || "Approve failed", "error");
      }
    });
  });

  developerRequests.querySelectorAll("button[data-reject-dev]").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await api.patch(`/admin/developers/${btn.dataset.rejectDev}/reject`, {});
        ui.toast("Developer request rejected", "success");
        loadDeveloperRequests();
      } catch (err) {
        ui.toast(err.message || "Reject failed", "error");
      }
    });
  });
}

async function loadReviewApps() {
  const data = await api.get("/apps?status=UNDER_REVIEW&limit=20");
  const items = data.items || data.apps || data.data || [];
  if (!items.length) return ui.renderEmpty(reviewGrid, "No apps under review.");
  reviewGrid.innerHTML = items.map(app => `
    <div class="card">
      <h3>${escapeHtml(app.name)}</h3>
      <p>${escapeHtml(app.description || "")}</p>
      <div class="toolbar" style="margin-top: 12px;">
        <button class="button" data-approve="${app.id}">Approve</button>
        <button class="button danger" data-reject="${app.id}">Reject</button>
      </div>
    </div>
  `).join("");

  reviewGrid.querySelectorAll("button[data-approve]").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await api.patch(`/admin/apps/${btn.dataset.approve}/approve`, {});
        ui.toast("App approved", "success");
        loadReviewApps();
      } catch (err) {
        ui.toast(err.message || "Approve failed", "error");
      }
    });
  });

  reviewGrid.querySelectorAll("button[data-reject]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const moderationNote = prompt("Reason for rejection:");
      if (!moderationNote) return;
      try {
        await api.patch(`/admin/apps/${btn.dataset.reject}/reject`, { moderationNote });
        ui.toast("App rejected", "success");
        loadReviewApps();
      } catch (err) {
        ui.toast(err.message || "Reject failed", "error");
      }
    });
  });
}

async function loadLiveApps() {
  const data = await api.get("/apps?status=PUBLISHED&limit=20");
  const items = data.items || data.apps || data.data || [];
  const suspended = await api.get("/apps?status=SUSPENDED&limit=20");
  const sItems = suspended.items || suspended.apps || suspended.data || [];
  const all = items.concat(sItems);
  if (!all.length) return ui.renderEmpty(liveGrid, "No apps to moderate.");
  liveGrid.innerHTML = all.map(app => `
    <div class="card">
      <h3>${escapeHtml(app.name)}</h3>
      <p>${escapeHtml(app.description || "")}</p>
      <div class="toolbar" style="margin-top: 12px;">
        <span class="badge">${app.status}</span>
        ${app.status === "SUSPENDED"
          ? `<button class="button" data-unsuspend="${app.id}">Unsuspend</button>`
          : `<button class="button warn" data-suspend="${app.id}">Suspend</button>`}
      </div>
    </div>
  `).join("");

  liveGrid.querySelectorAll("button[data-suspend]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const reason = prompt("Suspension reason:");
      if (!reason) return;
      try {
        await api.patch(`/admin/apps/${btn.dataset.suspend}/suspend`, { reason });
        ui.toast("App suspended", "success");
        loadLiveApps();
      } catch (err) {
        ui.toast(err.message || "Suspend failed", "error");
      }
    });
  });

  liveGrid.querySelectorAll("button[data-unsuspend]").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await api.patch(`/admin/apps/${btn.dataset.unsuspend}/unsuspend`, {});
        ui.toast("App unsuspended", "success");
        loadLiveApps();
      } catch (err) {
        ui.toast(err.message || "Unsuspend failed", "error");
      }
    });
  });
}

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

(async () => {
  try {
    if (window.__roleDenied) return;
    await loadDeveloperRequests();
    await loadReviewApps();
    await loadLiveApps();
  } catch (err) {
    ui.toast(err.message || "Failed to load moderation", "error");
  }
})();
