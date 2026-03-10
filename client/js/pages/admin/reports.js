const table = document.getElementById("reportTable");

async function loadReports() {
  const status = document.getElementById("statusFilter").value;
  const type = document.getElementById("typeFilter").value;
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  params.set("limit", 20);
  const data = await api.get(`/admin/reports?${params.toString()}`);
  const items = data.items || data.reports || data.data || [];
  if (!items.length) {
    table.innerHTML = "<tr><td class=\"empty\">No reports found.</td></tr>";
    return;
  }
  table.innerHTML = `
    <thead>
      <tr><th>ID</th><th>Type</th><th>Reason</th><th>Status</th><th>Action</th></tr>
    </thead>
    <tbody>
      ${items.map(r => `
        <tr>
          <td>${r.id}</td>
          <td>${r.type}</td>
          <td>${escapeHtml(r.reason || "")}</td>
          <td>${r.status}</td>
          <td>
            <button class="button ghost" data-resolve="${r.id}">Resolve</button>
          </td>
        </tr>
      `).join("")}
    </tbody>
  `;

  table.querySelectorAll("button[data-resolve]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const decision = prompt("Decision (APPROVED/REJECTED/FLAGGED):");
      if (!decision) return;
      const notes = prompt("Notes (optional):") || "";
      try {
        await api.patch(`/admin/reports/${btn.dataset.resolve}/resolve`, { decision, notes });
        ui.toast("Report resolved", "success");
        loadReports();
      } catch (err) {
        ui.toast(err.message || "Resolve failed", "error");
      }
    });
  });
}

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

document.getElementById("apply").addEventListener("click", () => {
  if (window.__roleDenied) return;
  loadReports().catch(err => ui.toast(err.message || "Load failed", "error"));
});

if (!window.__roleDenied) {
  loadReports().catch(err => ui.toast(err.message || "Load failed", "error"));
}
