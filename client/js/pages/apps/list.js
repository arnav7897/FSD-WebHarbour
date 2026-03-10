let page = 1;
const limit = 9;

const grid = document.getElementById("appsGrid");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const tagSelect = document.getElementById("tagSelect");
const pageInfo = document.getElementById("pageInfo");

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
    <div class="card">
      <h3>${escapeHtml(app.name)}</h3>
      <p>${escapeHtml(app.description || "")}</p>
      <div class="toolbar" style="margin-top: 12px;">
        <span class="badge">${app.status || "PUBLISHED"}</span>
        <a class="button secondary" href="/pages/apps/detail.html?id=${app.id}">View</a>
      </div>
    </div>
  `).join("");
  pageInfo.textContent = `Page ${data.page || page}`;
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
