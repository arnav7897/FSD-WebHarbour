const categoryForm = document.getElementById("categoryForm");
const tagForm = document.getElementById("tagForm");
const categoryList = document.getElementById("categoryList");
const tagList = document.getElementById("tagList");

async function loadCatalog() {
  ui.renderCardSkeletons(categoryList, 3);
  ui.renderCardSkeletons(tagList, 3);
  const [categories, tags] = await Promise.all([
    api.get("/categories"),
    api.get("/tags")
  ]);
  categoryList.innerHTML = categories.map(c => `<span class="badge">${escapeHtml(c.name)}</span>`).join(" ");
  tagList.innerHTML = tags.map(t => `<span class="badge">${escapeHtml(t.name)}</span>`).join(" ");
}





categoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (window.__roleDenied) return;
  const data = Object.fromEntries(new FormData(categoryForm));
  try {
    await api.post("/categories", data);
    ui.toast("Category added", "success");
    ui.success("The new category was added successfully.", "Category added");
    categoryForm.reset();
    loadCatalog();
  } catch (err) {
    ui.toast(err.message || "Create failed", "error");
  }
});

tagForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (window.__roleDenied) return;
  const data = Object.fromEntries(new FormData(tagForm));
  try {
    await api.post("/tags", data);
    ui.toast("Tag added", "success");
    ui.success("The new tag was added successfully.", "Tag added");
    tagForm.reset();
    loadCatalog();
  } catch (err) {
    ui.toast(err.message || "Create failed", "error");
  }
});

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

if (!window.__roleDenied) {
  loadCatalog().catch(err => ui.toast(err.message || "Loading failed", "error"));
}
