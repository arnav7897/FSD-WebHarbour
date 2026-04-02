const params = new URLSearchParams(window.location.search);
const appId = params.get("id");

const editForm = document.getElementById("editAppForm");
const categorySelect = document.getElementById("editCategorySelect");
const manageVersionsLink = document.getElementById("manageVersionsLink");
const prevStepBtn = document.getElementById("prevStepBtn");
const nextStepBtn = document.getElementById("nextStepBtn");
const submitEditBtn = document.getElementById("submitEditBtn");
const reviewName = document.getElementById("reviewName");
const reviewDescription = document.getElementById("reviewDescription");
const reviewBadges = document.getElementById("reviewBadges");
const editIconPreview = document.getElementById("editIconPreview");
const editBannerPreview = document.getElementById("editBannerPreview");
const editScreenshotsPreview = document.getElementById("editScreenshotsPreview");
const editAssetList = document.getElementById("editAssetList");

let currentStep = 1;
let categoriesCache = [];
let tagsCache = [];
let currentApp = null;

const TAG_FALLBACKS = [
  { id: 1, name: "Open Source", slug: "open-source" },
  { id: 2, name: "Free", slug: "free" },
  { id: 3, name: "Premium", slug: "premium" },
  { id: 4, name: "Beginner Friendly", slug: "beginner-friendly" },
  { id: 5, name: "Cross Platform", slug: "cross-platform" },
  { id: 6, name: "Trending", slug: "trending" },
  { id: 7, name: "Verified Developer", slug: "verified-developer" },
  { id: 8, name: "Security Audited", slug: "security-audited" }
];

async function loadCategories() {
  const categories = await api.get("/categories");
  categoriesCache = Array.isArray(categories) ? categories : [];
  categorySelect.innerHTML = categoriesCache.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join("");
}

async function loadTags() {
  try {
    const tags = await api.get("/tags");
    const normalized = Array.isArray(tags) ? tags : (tags.items || tags.tags || tags.data || []);
    tagsCache = normalized.length ? normalized : TAG_FALLBACKS;
  } catch {
    tagsCache = TAG_FALLBACKS;
  }

  tagsCache = tagsCache.map((tag, index) => ({
    id: Number(tag.id) || index + 1,
    name: tag.name || tag.label || TAG_FALLBACKS[index]?.name || `Tag ${index + 1}`,
    slug: tag.slug || ""
  })).sort((a, b) => Number(a.id) - Number(b.id));
}

function renderTagOptions(selectedIds = []) {
  return tagsCache.map((tag) => `
    <label class="tag-option">
      <input type="checkbox" value="${tag.id}" ${selectedIds.includes(Number(tag.id)) ? "checked" : ""} />
      <span class="tag-option-meta">
        <strong>${escapeHtml(tag.name)}</strong>
        <small>ID ${tag.id}</small>
      </span>
    </label>
  `).join("");
}

function renderSelectedTagBadges(tagIds = []) {
  if (!tagIds.length) return `<span class="muted">No tags selected yet.</span>`;
  return tagIds.map((tagId) => {
    const tag = tagsCache.find((item) => Number(item.id) === Number(tagId));
    return tag ? `<span class="badge">#${tag.id} ${escapeHtml(tag.name)}</span>` : "";
  }).join("");
}

function setTagSelection(root, values = []) {
  if (!root) return;
  const selected = values.map(Number).filter(Boolean);
  const label = root.querySelector("[data-tag-label]");
  const hiddenInput = root.querySelector("[data-tag-input]");
  const previewId = root.dataset.previewTarget;
  const preview = previewId ? document.getElementById(previewId) : null;
  const checkboxes = root.querySelectorAll(".tag-option input[type='checkbox']");

  checkboxes.forEach((checkbox) => {
    checkbox.checked = selected.includes(Number(checkbox.value));
  });
  if (hiddenInput) hiddenInput.value = selected.join(",");

  if (label) {
    if (!selected.length) {
      label.textContent = "Choose listing tags";
    } else if (selected.length === 1) {
      const tag = tagsCache.find((item) => Number(item.id) === selected[0]);
      label.textContent = tag ? tag.name : "1 tag selected";
    } else {
      label.textContent = `${selected.length} tags selected`;
    }
  }

  if (preview) preview.innerHTML = renderSelectedTagBadges(selected);
  updateReviewPanel();
}

function initTagSelect(root, selectedIds = []) {
  if (!root) return;

  const trigger = root.querySelector("[data-tag-trigger]");
  const menu = root.querySelector("[data-tag-menu]");
  const optionsContainer = root.querySelector(".tag-option-list");
  if (!trigger || !menu || !optionsContainer) return;

  optionsContainer.innerHTML = renderTagOptions(selectedIds);
  setTagSelection(root, selectedIds);

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !menu.classList.contains("hidden");
    closeTagMenus();
    if (!isOpen) {
      menu.classList.remove("hidden");
      trigger.setAttribute("aria-expanded", "true");
    }
  });

  optionsContainer.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const selected = Array.from(optionsContainer.querySelectorAll("input:checked"))
        .map((item) => Number(item.value))
        .filter(Boolean);
      setTagSelection(root, selected);
    });
  });
}

function closeTagMenus() {
  document.querySelectorAll(".tag-select-menu").forEach((element) => element.classList.add("hidden"));
  document.querySelectorAll(".tag-select-trigger").forEach((element) => element.setAttribute("aria-expanded", "false"));
}

function readTagSelection() {
  const input = editForm.querySelector("[data-tag-input='edit-main']");
  if (!input?.value) return [];
  return input.value.split(",").map((value) => Number(value.trim())).filter(Boolean);
}

function renderMediaThumb(url, alt) {
  if (!url) return `<div class="media-thumb empty-thumb"><span class="muted">None</span></div>`;
  return `
    <div class="media-thumb">
      <img src="${escapeHtml(ui.assetUrl(url))}" alt="${escapeHtml(alt)}" loading="lazy" />
    </div>
  `;
}

function renderScreenshotStrip(screenshots, appName) {
  const items = Array.isArray(screenshots) ? screenshots : [];
  if (!items.length) {
    return `<div class="media-strip empty-thumb"><span class="muted">No screenshots</span></div>`;
  }
  return `
    <div class="media-strip">
      ${items.slice(0, 6).map((url, index) => `
        <img src="${escapeHtml(ui.assetUrl(url))}" alt="${escapeHtml(appName)} screenshot ${index + 1}" loading="lazy" />
      `).join("")}
    </div>
  `;
}

function renderAssetList(assets) {
  const items = Array.isArray(assets) ? assets : [];
  if (!items.length) {
    editAssetList.innerHTML = "<div class=\"empty\">No product files uploaded yet.</div>";
    return;
  }

  editAssetList.innerHTML = items.map((asset) => `
    <div class="card">
      <div class="toolbar space-between">
        <div>
          <strong>${escapeHtml(asset.label || asset.filename || "File")}</strong>
          <p class="muted">${escapeHtml(asset.assetType || "OTHER")} · ${escapeHtml(asset.filename || "")}</p>
        </div>
        <a class="button ghost" href="${escapeHtml(ui.assetUrl(`/apps/${appId}/assets/${asset.id}/download`))}" target="_blank" rel="noopener">Download</a>
      </div>
    </div>
  `).join("");
}

function populateForm() {
  if (!currentApp) return;
  editForm.elements.name.value = currentApp.name || "";
  editForm.elements.description.value = currentApp.description || "";
  categorySelect.value = currentApp.category?.id || "";

  const selectedTags = (Array.isArray(currentApp.tags) ? currentApp.tags : [])
    .map((tag) => Number(tag?.id || tag))
    .filter(Boolean);
  initTagSelect(document.querySelector("[data-tag-select='edit-main']"), selectedTags);

  editIconPreview.innerHTML = renderMediaThumb(currentApp.iconUrl, `${currentApp.name} icon`);
  editBannerPreview.innerHTML = renderMediaThumb(currentApp.bannerUrl, `${currentApp.name} banner`);
  editScreenshotsPreview.innerHTML = renderScreenshotStrip(currentApp.screenshots, currentApp.name);
  renderAssetList(currentApp.assets);
  updateReviewPanel();
}

function updateReviewPanel() {
  const name = editForm?.elements?.name?.value?.trim() || currentApp?.name || "Untitled app";
  const description = editForm?.elements?.description?.value?.trim() || currentApp?.description || "No description yet.";
  reviewName.textContent = name;
  reviewDescription.textContent = description;
  reviewBadges.innerHTML = renderSelectedTagBadges(readTagSelection());
}

function setStep(step) {
  currentStep = Math.max(1, Math.min(3, step));
  document.querySelectorAll("[data-step-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", Number(panel.dataset.stepPanel) === currentStep);
  });
  document.querySelectorAll("[data-step-tab]").forEach((tab) => {
    tab.classList.toggle("is-active", Number(tab.dataset.stepTab) === currentStep);
  });

  prevStepBtn.disabled = currentStep === 1;
  nextStepBtn.classList.toggle("hidden", currentStep === 3);
  submitEditBtn.classList.toggle("hidden", currentStep !== 3);
}

function validateCurrentStep() {
  if (currentStep === 1) {
    if (!editForm.elements.name.value.trim() || !editForm.elements.description.value.trim() || !categorySelect.value) {
      ui.toast("Fill in the name, description, and category to continue.", "error");
      return false;
    }
  }
  return true;
}

async function loadApp() {
  if (!appId) throw new Error("Missing app id.");
  currentApp = await api.get(`/apps/${appId}`);
  populateForm();
}

async function submitEdit(event) {
  event.preventDefault();
  if (!validateCurrentStep()) return;

  const btn = submitEditBtn;
  ui.setLoading(btn, true);

  try {
    const payload = {
      name: editForm.elements.name.value.trim(),
      description: editForm.elements.description.value.trim(),
      categoryId: Number(categorySelect.value),
      tags: readTagSelection()
    };

    await api.patch(`/apps/${appId}`, payload);

    const iconFile = editForm.querySelector("input[name='icon']")?.files?.[0];
    const bannerFile = editForm.querySelector("input[name='banner']")?.files?.[0];
    const screenshotFiles = editForm.querySelector("input[name='screenshots']")?.files || [];
    const replaceScreens = editForm.querySelector("input[name='replaceScreenshots']")?.checked;

    if (iconFile || bannerFile || screenshotFiles.length) {
      const mediaData = new FormData();
      if (iconFile) mediaData.append("icon", iconFile);
      if (bannerFile) mediaData.append("banner", bannerFile);
      Array.from(screenshotFiles).forEach((file) => mediaData.append("screenshots", file));
      mediaData.append("mode", replaceScreens ? "replace" : "append");
      await api.postForm(`/apps/${appId}/media`, mediaData);
    }

    const assetFile = editForm.querySelector("input[name='assetFile']")?.files?.[0];
    if (assetFile) {
      const assetData = new FormData();
      assetData.append("file", assetFile);
      assetData.append("assetType", editForm.elements.assetType.value || "OTHER");
      assetData.append("label", editForm.elements.assetLabel.value || "");
      assetData.append("description", editForm.elements.assetDescription.value || "");
      await api.postForm(`/apps/${appId}/assets/upload`, assetData);
    }

    ui.toast("App updated", "success");
    ui.success("Your app listing was updated successfully.", "Changes submitted");
    await loadApp();
    editForm.querySelector("input[name='icon']").value = "";
    editForm.querySelector("input[name='banner']").value = "";
    editForm.querySelector("input[name='screenshots']").value = "";
    editForm.querySelector("input[name='assetFile']").value = "";
    editForm.elements.assetLabel.value = "";
    editForm.elements.assetDescription.value = "";
    editForm.elements.replaceScreenshots.checked = false;
    setStep(1);
  } catch (err) {
    ui.toast(err.message || "Update failed", "error");
  } finally {
    ui.setLoading(btn, false);
  }
}

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

prevStepBtn.addEventListener("click", () => setStep(currentStep - 1));
nextStepBtn.addEventListener("click", () => {
  if (!validateCurrentStep()) return;
  setStep(currentStep + 1);
});

document.querySelectorAll("[data-step-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const nextStep = Number(tab.dataset.stepTab);
    if (nextStep > currentStep && !validateCurrentStep()) return;
    setStep(nextStep);
  });
});

editForm.addEventListener("submit", submitEdit);
editForm.elements.name.addEventListener("input", updateReviewPanel);
editForm.elements.description.addEventListener("input", updateReviewPanel);

document.addEventListener("click", (event) => {
  if (!event.target.closest(".tag-select")) closeTagMenus();
});

(async () => {
  try {
    if (!appId) throw new Error("Missing app id.");
    await Promise.all([loadCategories(), loadTags()]);
    manageVersionsLink.href = ui.pageUrl(`pages/developer/versions.html?id=${appId}`);
    await loadApp();
    setStep(1);
  } catch (err) {
    ui.toast(err.message || "Failed to load app editor", "error");
  }
})();
