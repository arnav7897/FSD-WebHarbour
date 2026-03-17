const params = new URLSearchParams(window.location.search);
const appId = params.get("id");
const overviewEl = document.getElementById("overview");
const appAnalytics = document.getElementById("appAnalytics");

function metricCard(label, value) {
  return `<div class="card"><h3>${label}</h3><p>${value}</p></div>`;
}

async function loadOverview() {
  const data = await api.get("/developer/analytics/overview");
  const totals = data.totals || {};
  const items = [
    ["Total Apps", totals.apps || data.totalApps || 0],
    ["Total Downloads", totals.downloads || data.totalDownloads || 0],
    ["Total Favorites", totals.favorites || data.totalFavorites || 0],
    ["Avg Rating", totals.averageRating || data.averageRating || 0]
  ];
  overviewEl.innerHTML = items.map(i => metricCard(i[0], i[1])).join("");
}

async function loadAppAnalytics() {
  if (!appId) {
    appAnalytics.innerHTML = "<div class=\"empty\">Select an app from Dashboard to view analytics.</div>";
    return;
  }
  const data = await api.get(`/developer/analytics/apps/${appId}`);
  const totals = data.totals || {};
  const versionBlock = data.versions || {};
  const versions = Array.isArray(versionBlock)
    ? versionBlock
    : (versionBlock.trends || []);
  appAnalytics.innerHTML = `
    <div class="toolbar">
      <span class="badge">Downloads: ${totals.downloads || data.totalDownloads || 0}</span>
      <span class="badge">Favorites: ${totals.favorites || data.totalFavorites || 0}</span>
      <span class="badge">Avg Rating: ${totals.averageRating || data.averageRating || 0}</span>
    </div>
    <table class="table">
      <thead><tr><th>Version</th><th>Downloads</th><th>Installs</th><th>Adoption %</th></tr></thead>
      <tbody>
        ${versions.map(v => `<tr><td>${escapeHtml(v.version)}</td><td>${v.downloads || 0}</td><td>${v.installs || 0}</td><td>${v.adoptionRate || 0}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

(async () => {
  if (window.__roleDenied) return;
  try {
    await loadOverview();
    await loadAppAnalytics();
  } catch (err) {
    ui.toast(err.message || "Failed to load analytics", "error");
  }
})();
