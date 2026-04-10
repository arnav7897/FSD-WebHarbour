const grid = document.getElementById("favoritesGrid");

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

function renderIcon(app) {
  const gradient = pickGradient(app.name);
  if (app.iconUrl) {
    return `
      <div class="app-icon ${gradient} has-image">
        <img src="${escapeHtml(ui.assetUrl(app.iconUrl))}" alt="${escapeHtml(app.name)} icon" loading="lazy" />
      </div>
    `;
  }
  return `<div class="app-icon ${gradient}">${escapeHtml(initials(app.name))}</div>`;
}

(async () => {
  try {
    if (window.__roleDenied) return;
    ui.renderCardSkeletons(grid, 4);
    const data = await api.get("/users/me/favorites");
    const items = data.items || data.favorites || data.data || [];
    if (!items.length) return ui.renderEmpty(grid, "No favorites yet.");
    grid.innerHTML = items.map(item => {
      const app = item.app || item;
      return `
        <div class="card app-list-card">
          ${renderIcon(app)}
          <div class="app-meta">
            <h3>${escapeHtml(app.name)}</h3>
            <p>${escapeHtml(app.shortDescription || app.description || "")}</p>
            <div class="toolbar" style="margin-top: 12px;">
              <a class="button secondary" href="/pages/apps/detail.html?id=${app.id}">View</a>
              <button class="button ghost" data-remove="${app.id}">Remove</button>
            </div>
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
