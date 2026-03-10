const grid = document.getElementById("favoritesGrid");

(async () => {
  try {
    if (window.__roleDenied) return;
    const data = await api.get("/users/me/favorites");
    const items = data.items || data.favorites || data.data || [];
    if (!items.length) return ui.renderEmpty(grid, "No favorites yet.");
    grid.innerHTML = items.map(item => {
      const app = item.app || item;
      return `
        <div class="card">
          <h3>${escapeHtml(app.name)}</h3>
          <p>${escapeHtml(app.description || "")}</p>
          <div class="toolbar" style="margin-top: 12px;">
            <a class="button secondary" href="/pages/apps/detail.html?id=${app.id}">View</a>
            <button class="button ghost" data-remove="${app.id}">Remove</button>
          </div>
        </div>
      `;
    }).join("");

    grid.querySelectorAll("button[data-remove]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await api.del(`/apps/${btn.dataset.remove}/favorite`);
          btn.closest(".card").remove();
        } catch (err) {
          ui.toast(err.message || "Remove failed", "error");
        }
      });
    });
  } catch (err) {
    ui.toast(err.message || "Failed to load favorites", "error");
  }
})();

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}
