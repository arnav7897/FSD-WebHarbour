let page = 1;
const limit = 9;

const grid = document.getElementById("appsGrid");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const tagSelect = document.getElementById("tagSelect");
const pageInfo = document.getElementById("pageInfo");

const params = new URLSearchParams(window.location.search);
const initialQuery = params.get("q");
if (initialQuery) {
  searchInput.value = initialQuery;
}

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

async function loadFilters() {
  const [categories, tags] = await Promise.all([
    api.get("/categories"),
    api.get("/tags")
  ]);
  categorySelect.innerHTML = `<option value="">All categories</option>` +
    categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  tagSelect.innerHTML = `<option value="">All tags</option>` +
    tags.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
}

async function loadApps() {
  ui.renderCardSkeletons(grid, 6);
  const params = new URLSearchParams();
  if (searchInput.value) params.set("q", searchInput.value);
  if (categorySelect.value) params.set("categoryId", categorySelect.value);
  if (tagSelect.value) params.set("tagId", tagSelect.value);
  params.set("page", page);
  params.set("limit", limit);

  const data = await api.get(`/apps?${params.toString()}`);
  const items = data.items || data.apps || data.data || [];
  if (!items.length) {
    ui.renderEmpty(grid, "No apps found.");
    pageInfo.textContent = "Page " + page;
    return;
  }

  grid.innerHTML = items.map(app => `
    <div class="card app-list-card">
      ${renderIcon(app)}
      <div class="app-meta">
        <h3>${escapeHtml(app.name)}</h3>
        <p>${escapeHtml(app.shortDescription || app.description || "")}</p>
        <div class="toolbar" style="margin-top: 12px;">
          <span class="badge">${app.status || "PUBLISHED"}</span>
          <a class="button secondary" href="${ui.pageUrl(`pages/apps/detail.html?id=${app.id}`)}">View</a>
        </div>
      </div>
    </div>
  `).join("");
  pageInfo.textContent = `Page ${data?.pagination?.page || page}`;
}

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

document.getElementById("applyFilters").addEventListener("click", () => {
  page = 1;
  loadApps().catch(err => ui.toast(err.message || "Failed to load", "error"));
});

document.getElementById("prevPage").addEventListener("click", () => {
  if (page > 1) page -= 1;
  loadApps().catch(err => ui.toast(err.message || "Failed to load", "error"));
});

document.getElementById("nextPage").addEventListener("click", () => {
  page += 1;
  loadApps().catch(err => ui.toast(err.message || "Failed to load", "error"));
});

(async () => {
  try {
    await loadFilters();
    await loadApps();
  } catch (err) {
    ui.toast(err.message || "Failed to load marketplace", "error");
  }
})();
