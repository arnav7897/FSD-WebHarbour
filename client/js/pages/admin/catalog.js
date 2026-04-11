/* ──────────────────────────────────────────────
   Admin Catalog Page
   Manages marketplace categories and tags.
   ────────────────────────────────────────────── */

const categoryForm = document.getElementById("categoryForm");
const tagForm = document.getElementById("tagForm");
const categoryList = document.getElementById("categoryList");
const tagList = document.getElementById("tagList");

// ── Helpers ─────────────────────────────────────

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

// ── Load Catalog ────────────────────────────────

async function loadCatalog() {
  ui.renderCardSkeletons(categoryList, 3);
  ui.renderCardSkeletons(tagList, 3);

  const [categories, tags] = await Promise.all([
    api.get("/categories"),
    api.get("/tags")
  ]);

  const catItems = Array.isArray(categories) ? categories : [];
  const tagItems = Array.isArray(tags) ? tags : [];

  if (!catItems.length) {
    categoryList.innerHTML = `<div class="empty">No categories yet.</div>`;
  } else {
    categoryList.innerHTML =
      `<p class="muted" style="margin-bottom: 8px;">${catItems.length} categories</p>` +
      catItems.map(c =>
        `<span class="badge" title="slug: ${escapeHtml(c.slug || "")}">${escapeHtml(c.name)}</span>`
      ).join(" ");
  }

  if (!tagItems.length) {
    tagList.innerHTML = `<div class="empty">No tags yet.</div>`;
  } else {
    tagList.innerHTML =
      `<p class="muted" style="margin-bottom: 8px;">${tagItems.length} tags</p>` +
      tagItems.map(t =>
        `<span class="badge" title="slug: ${escapeHtml(t.slug || "")}">${escapeHtml(t.name)}</span>`
      ).join(" ");
  }
}

// ── Create Category ─────────────────────────────

categoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (window.__roleDenied) return;

  const btn = categoryForm.querySelector("button");
  const data = Object.fromEntries(new FormData(categoryForm));

  if (!data.name || !data.name.trim()) {
    ui.toast("Category name is required", "error");
    return;
  }

  btn.disabled = true;
  try {
    await api.post("/categories", data);
    ui.toast("Category added", "success");
    ui.success("The new category was added successfully.", "Category added");
    categoryForm.reset();
    loadCatalog();
  } catch (err) {
    ui.toast(err.message || "Create failed", "error");
  } finally {
    btn.disabled = false;
  }
});

// ── Create Tag ──────────────────────────────────

tagForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (window.__roleDenied) return;

  const btn = tagForm.querySelector("button");
  const data = Object.fromEntries(new FormData(tagForm));

  if (!data.name || !data.name.trim()) {
    ui.toast("Tag name is required", "error");
    return;
  }

  btn.disabled = true;
  try {
    await api.post("/tags", data);
    ui.toast("Tag added", "success");
    ui.success("The new tag was added successfully.", "Tag added");
    tagForm.reset();
    loadCatalog();
  } catch (err) {
    ui.toast(err.message || "Create failed", "error");
  } finally {
    btn.disabled = false;
  }
});

// ── Page Init ───────────────────────────────────

if (!window.__roleDenied) {
  loadCatalog().catch(err => ui.toast(err.message || "Loading failed", "error"));
}
