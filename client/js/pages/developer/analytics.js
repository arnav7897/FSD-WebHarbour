const params = new URLSearchParams(window.location.search);
const appId = params.get("id");
const overviewEl = document.getElementById("overview");
const appAnalytics = document.getElementById("appAnalytics");

function metricCard(label, value) {
  return `<div class="card"><h3>${label}</h3><p>${value}</p></div>`;
}

async function loadOverview() {
  const data = await api.get("/developer/analytics/overview");
  const items = [
    ["Total Apps", data.totalApps || 0],
    ["Total Downloads", data.totalDownloads || 0],
    ["Total Favorites", data.totalFavorites || 0],
    ["Avg Rating", data.averageRating || 0]
  ];
  overviewEl.innerHTML = items.map(i => metricCard(i[0], i[1])).join("");
}

async function loadAppAnalytics() {
  if (!appId) {
    appAnalytics.innerHTML = "<div class=\"empty\">Select an app from Dashboard to view analytics.</div>";
    return;
  }
  const data = await api.get(`/developer/analytics/apps/${appId}`);
  const versions = data.versions || [];
  appAnalytics.innerHTML = `
    <div class="toolbar">
      <span class="badge">Downloads: ${data.totalDownloads || 0}</span>
      <span class="badge">Favorites: ${data.totalFavorites || 0}</span>
      <span class="badge">Avg Rating: ${data.averageRating || 0}</span>
    </div>
    <table class="table">
      <thead><tr><th>Version</th><th>Downloads</th><th>Favorites</th></tr></thead>
      <tbody>
        ${versions.map(v => `<tr><td>${escapeHtml(v.version)}</td><td>${v.downloads || 0}</td><td>${v.favorites || 0}</td></tr>`).join("")}
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
