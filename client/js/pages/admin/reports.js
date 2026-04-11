/* ──────────────────────────────────────────────
   Admin Reports Page
   Lists trust & safety reports with filtering
   and provides report resolution workflow.
   ────────────────────────────────────────────── */

const table = document.getElementById("reportTable");

// ── Helpers ─────────────────────────────────────

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(status) {
  const classes = {
    PENDING: "badge-warn",
    APPROVED: "badge-success",
    REJECTED: "badge-danger",
    FLAGGED: "badge-info"
  };
  return `<span class="badge ${classes[status] || ""}">${escapeHtml(status)}</span>`;
}

// ── Load & Render ───────────────────────────────

async function loadReports() {
  ui.renderTableSkeleton(table, 7, 5);

  const status = document.getElementById("statusFilter").value;
  const type = document.getElementById("typeFilter").value;
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  params.set("limit", 20);

  const data = await api.get(`/admin/reports?${params.toString()}`);
  const items = data.items || data.reports || data.data || [];

  if (!items.length) {
    table.innerHTML = `<tr><td class="empty" colspan="7">No reports found.</td></tr>`;
    return;
  }

  table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Type</th>
        <th>Reporter</th>
        <th>Reason</th>
        <th>Date</th>
        <th>Status</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(r => `
        <tr>
          <td>${r.id}</td>
          <td><span class="badge">${escapeHtml(r.type)}</span></td>
          <td>${escapeHtml(r.reporter?.name || r.reporter?.email || `User #${r.reporterId}`)}</td>
          <td>${escapeHtml(r.reason || "")}</td>
          <td>${formatDate(r.createdAt)}</td>
          <td>${statusBadge(r.status)}</td>
          <td>
            ${r.status === "PENDING"
              ? `<button class="button ghost" data-resolve="${r.id}">Resolve</button>`
              : `<span class="muted">Resolved</span>`}
          </td>
        </tr>
      `).join("")}
    </tbody>
  `;

  // Resolve handler
  table.querySelectorAll("button[data-resolve]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const decision = prompt("Decision (APPROVED / REJECTED / FLAGGED):");
      if (!decision) return;
      const notes = prompt("Notes (optional):") || "";
      btn.disabled = true;
      btn.textContent = "Resolving…";
      try {
        await api.patch(`/admin/reports/${btn.dataset.resolve}/resolve`, { decision, notes });
        ui.toast("Report resolved", "success");
        loadReports();
      } catch (err) {
        ui.toast(err.message || "Resolve failed", "error");
        btn.disabled = false;
        btn.textContent = "Resolve";
      }
    });
  });
}

// ── Event Binding ───────────────────────────────

document.getElementById("apply").addEventListener("click", () => {
  if (window.__roleDenied) return;
  loadReports().catch(err => ui.toast(err.message || "Load failed", "error"));
});

// ── Page Init ───────────────────────────────────

if (!window.__roleDenied) {
  loadReports().catch(err => ui.toast(err.message || "Load failed", "error"));
}
