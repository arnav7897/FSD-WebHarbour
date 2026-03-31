const createForm = document.getElementById("createAppForm");
const categorySelect = document.getElementById("categorySelect");
const appsGrid = document.getElementById("appsGrid");
const becomeDevBtn = document.getElementById("becomeDev");
const refreshDevBtn = document.getElementById("refreshDev");
const devStatusText = document.getElementById("devStatusText");
const successOverlay = document.getElementById("successOverlay");
const successTitle = document.getElementById("successTitle");
const successMessage = document.getElementById("successMessage");
const successClose = document.getElementById("successClose");

let categoriesCache = [];
let tagsCache = [];
let activeSuccessTimer = null;

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

  tagsCache = tagsCache
    .map((tag, index) => ({
      id: Number(tag.id) || index + 1,
      name: tag.name || tag.label || TAG_FALLBACKS[index]?.name || `Tag ${index + 1}`,
      slug: tag.slug || ""
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));
}

function renderCategoryOptions(selectedId) {
  if (!categoriesCache.length) return `<option value="">No categories</option>`;
  return categoriesCache.map((category) => {
    const isSelected = Number(selectedId) === Number(category.id);
    return `<option value="${category.id}"${isSelected ? " selected" : ""}>${escapeHtml(category.name)}</option>`;
  }).join("");
}

function normalizeTagIds(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => Number(tag?.id || tag))
    .filter(Boolean);
}

function renderTagOptions(selectedIds = []) {
  if (!tagsCache.length) return `<div class="muted">No tags available.</div>`;
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
    const match = tagsCache.find((tag) => Number(tag.id) === Number(tagId));
    if (!match) return "";
    return `<span class="badge">#${match.id} ${escapeHtml(match.name)}</span>`;
  }).join("");
}

function setTagSelection(root, values = []) {
  if (!root) return;

  const selected = values.map(Number).filter(Boolean);
  const label = root.querySelector("[data-tag-label]");
  const hiddenInput = root.querySelector("[data-tag-input]");
  const previewId = root.dataset.previewTarget;
  const preview = previewId ? document.getElementById(previewId) : root.parentElement?.querySelector(".tag-preview");
  const checkboxes = root.querySelectorAll(".tag-option input[type='checkbox']");

  checkboxes.forEach((checkbox) => {
    checkbox.checked = selected.includes(Number(checkbox.value));
  });

  hiddenInput.value = selected.join(",");

  if (label) {
    if (!selected.length) {
      label.textContent = "Choose listing tags";
    } else if (selected.length === 1) {
      const tag = tagsCache.find((item) => Number(item.id) === selected[0]);
      label.textContent = tag ? `${tag.name}` : "1 tag selected";
    } else {
      label.textContent = `${selected.length} tags selected`;
    }
  }

  if (preview) {
    preview.innerHTML = renderSelectedTagBadges(selected);
  }
}

function initTagSelect(root, defaultValues = []) {
  if (!root) return;

  const trigger = root.querySelector("[data-tag-trigger]");
  const menu = root.querySelector("[data-tag-menu]");
  const optionsContainer = root.querySelector(".tag-option-list");
  if (!trigger || !menu || !optionsContainer) return;

  optionsContainer.innerHTML = renderTagOptions(defaultValues);
  setTagSelection(root, defaultValues);

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !menu.classList.contains("hidden");
    document.querySelectorAll(".tag-select-menu").forEach((element) => element.classList.add("hidden"));
    document.querySelectorAll(".tag-select-trigger").forEach((element) => element.setAttribute("aria-expanded", "false"));
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

function readTagSelection(scope) {
  const input = scope.querySelector("[data-tag-input], input[name='tags']");
  if (!input?.value) return [];
  return input.value.split(",").map((value) => Number(value.trim())).filter(Boolean);
}

function showSuccessPopup(title, message) {
  if (!successOverlay || !successTitle || !successMessage) return;
  if (activeSuccessTimer) window.clearTimeout(activeSuccessTimer);

  successTitle.textContent = title;
  successMessage.textContent = message;
  successOverlay.classList.remove("hidden");
  successOverlay.classList.add("is-visible");
  successOverlay.setAttribute("aria-hidden", "false");

  activeSuccessTimer = window.setTimeout(() => {
    hideSuccessPopup();
  }, 2600);
}

function hideSuccessPopup() {
  if (!successOverlay) return;
  successOverlay.classList.remove("is-visible");
  successOverlay.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!successOverlay.classList.contains("is-visible")) {
      successOverlay.classList.add("hidden");
    }
  }, 220);
}

function renderMediaThumb(url, alt) {
  if (!url) {
    return `<div class="media-thumb empty-thumb"><span class="muted">None</span></div>`;
  }
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

function renderAssetList(assets, appId) {
  const items = Array.isArray(assets) ? assets : [];
  if (!items.length) {
    return `<div class="empty-thumb"><span class="muted">No product files uploaded</span></div>`;
  }
  return `
    <div class="asset-list">
      ${items.map((asset) => `
        <div class="toolbar" style="justify-content: space-between; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px;">
          <div>
            <strong>${escapeHtml(asset.label || asset.filename || "File")}</strong>
            <p class="muted">${escapeHtml(asset.assetType || "OTHER")} · ${escapeHtml(asset.filename || "")}</p>
          </div>
          <div class="toolbar">
            <a class="button ghost" href="${escapeHtml(ui.assetUrl(`/apps/${appId}/assets/${asset.id}/download`))}" target="_blank" rel="noopener">Download</a>
            <button class="button ghost" type="button" data-delete-asset="${asset.id}" data-app-id="${appId}">Delete</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderEditTagSelect(app) {
  const selectedTags = normalizeTagIds(app.tags);
  const selectId = `edit-${app.id}`;
  const previewId = `tagPreview-${app.id}`;
  return `
    <div class="tag-select" data-tag-select="${selectId}" data-preview-target="${previewId}">
      <button class="input tag-select-trigger" type="button" data-tag-trigger="${selectId}" aria-expanded="false">
        <span data-tag-label="${selectId}">Choose listing tags</span>
      </button>
      <div class="tag-select-menu hidden" data-tag-menu="${selectId}">
        <div class="tag-option-list">${renderTagOptions(selectedTags)}</div>
      </div>
      <input type="hidden" name="tags" data-tag-input="${selectId}" value="${selectedTags.join(",")}" />
    </div>
    <div id="${previewId}" class="tag-preview">${renderSelectedTagBadges(selectedTags)}</div>
  `;
}

function initDynamicTagSelects(scope = document) {
  scope.querySelectorAll("[data-tag-select]").forEach((root) => {
    if (root.dataset.bound === "true") return;
    root.dataset.bound = "true";
    const input = root.querySelector("[data-tag-input]");
    const defaultValues = input?.value ? input.value.split(",").map((value) => Number(value.trim())).filter(Boolean) : [];
    initTagSelect(root, defaultValues);
  });
}

async function loadApps() {
  if (!auth.hasRole("DEVELOPER")) {
    ui.renderEmpty(appsGrid, "Become a developer to manage your apps here.");
    return;
  }

  const status = document.getElementById("statusFilter").value;
  const params = new URLSearchParams();
  params.set("mine", "true");
  if (status) params.set("status", status);
  params.set("limit", 12);

  const data = await api.get(`/apps?${params.toString()}`);
  const items = data.items || data.apps || data.data || [];
  if (!items.length) return ui.renderEmpty(appsGrid, "No apps found.");

  appsGrid.innerHTML = items.map((app) => `
    <div class="card">
      <div class="split-row">
        <div>
          <h3>${escapeHtml(app.name)}</h3>
          <p>${escapeHtml(app.description || "")}</p>
        </div>
        ${app.iconUrl ? `<div class="media-thumb mini-thumb"><img src="${escapeHtml(ui.assetUrl(app.iconUrl))}" alt="${escapeHtml(app.name)} icon" loading="lazy" /></div>` : ""}
      </div>
      <div class="toolbar" style="margin-top: 12px;">
        <span class="badge">${app.status}</span>
        <a class="button secondary" data-versions="${app.id}" href="${ui.pageUrl(`pages/developer/versions.html?id=${app.id}`)}">Versions</a>
        <a class="button ghost" href="${ui.pageUrl(`pages/developer/analytics.html?id=${app.id}`)}">Analytics</a>
        <button class="button" data-submit="${app.id}">Submit</button>
        <button class="button ghost" data-edit="${app.id}">Edit</button>
      </div>
      <div class="edit-form hidden" data-edit-form="${app.id}">
        <div class="form-row">
          <label>Name</label>
          <input class="input" type="text" name="name" value="${escapeHtml(app.name)}" />
        </div>
        <div class="form-row">
          <label>Description</label>
          <textarea class="input" name="description">${escapeHtml(app.description || "")}</textarea>
        </div>
        <div class="form-row">
          <label>Category</label>
          <select class="input" name="categoryId">
            ${renderCategoryOptions(app.category?.id)}
          </select>
        </div>
        <div class="form-row">
          <label>Tags</label>
          ${renderEditTagSelect(app)}
        </div>
        <div class="media-preview">
          <div>
            <p class="media-label">Icon</p>
            ${renderMediaThumb(app.iconUrl, `${app.name} icon`)}
          </div>
          <div>
            <p class="media-label">Banner</p>
            ${renderMediaThumb(app.bannerUrl, `${app.name} banner`)}
          </div>
          <div class="media-wide">
            <p class="media-label">Screenshots</p>
            ${renderScreenshotStrip(app.screenshots, app.name)}
          </div>
        </div>
        <div class="form-row">
          <label>Icon image</label>
          <input class="input" type="file" name="icon" accept="image/*" />
        </div>
        <div class="form-row">
          <label>Banner image</label>
          <input class="input" type="file" name="banner" accept="image/*" />
        </div>
        <div class="form-row">
          <label>Screenshots</label>
          <input class="input" type="file" name="screenshots" accept="image/*" multiple />
          <label class="checkbox">
            <input type="checkbox" name="replaceScreenshots" />
            Replace existing screenshots
          </label>
        </div>
        <div class="toolbar" style="margin-top: 12px;">
          <button class="button secondary" data-save="${app.id}">Save</button>
          <button class="button ghost" data-cancel="${app.id}">Cancel</button>
          <button class="button ghost" data-upload="${app.id}">Upload Media</button>
        </div>
        <div class="form-row" style="margin-top: 18px;">
          <label>Product files / documents</label>
          ${renderAssetList(app.assets, app.id)}
        </div>
        <div class="form-row">
          <label>File</label>
          <input class="input" type="file" name="assetFile" accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.zip,.rar,.7z,.tar,.gz,application/octet-stream" />
        </div>
        <div class="form-row">
          <label>Asset type</label>
          <select class="input" name="assetType">
            <option value="DOCUMENT">DOCUMENT</option>
            <option value="GUIDE">GUIDE</option>
            <option value="LICENSE">LICENSE</option>
            <option value="ARCHIVE">ARCHIVE</option>
            <option value="ATTACHMENT">ATTACHMENT</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
        <div class="form-row">
          <label>Label</label>
          <input class="input" type="text" name="assetLabel" placeholder="Installation guide" />
        </div>
        <div class="form-row">
          <label>Description</label>
          <textarea class="input" name="assetDescription" placeholder="Short note about this file"></textarea>
        </div>
        <div class="toolbar" style="margin-top: 12px;">
          <button class="button ghost" type="button" data-upload-asset="${app.id}">Upload File</button>
        </div>
      </div>
    </div>
  `).join("");

  initDynamicTagSelects(appsGrid);

  appsGrid.querySelectorAll("button[data-submit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api.post(`/apps/${btn.dataset.submit}/submit`, {});
        ui.toast("Submitted for review", "success");
        showSuccessPopup("Sent for review", "Your app listing has been forwarded for moderation.");
        loadApps();
      } catch (err) {
        ui.toast(err.message || "Submit failed", "error");
      }
    });
  });

  appsGrid.querySelectorAll("a[data-versions]").forEach((link) => {
    link.addEventListener("click", () => {
      sessionStorage.setItem("lastAppId", link.dataset.versions);
    });
  });

  appsGrid.querySelectorAll("button[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = appsGrid.querySelector(`[data-edit-form="${btn.dataset.edit}"]`);
      if (form) form.classList.toggle("hidden");
    });
  });

  appsGrid.querySelectorAll("button[data-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = appsGrid.querySelector(`[data-edit-form="${btn.dataset.cancel}"]`);
      if (form) form.classList.add("hidden");
    });
  });

  appsGrid.querySelectorAll("button[data-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const form = appsGrid.querySelector(`[data-edit-form="${btn.dataset.save}"]`);
      if (!form) return;

      const name = form.querySelector("input[name='name']").value.trim();
      const description = form.querySelector("textarea[name='description']").value.trim();
      const categoryId = Number(form.querySelector("select[name='categoryId']").value);
      const tags = readTagSelection(form);

      if (!name || !description || !categoryId) {
        ui.toast("Name, description, and category are required", "error");
        return;
      }

      const payload = { name, description, categoryId, tags };
      ui.setLoading(btn, true);
      try {
        await api.patch(`/apps/${btn.dataset.save}`, payload);
        ui.toast("App updated", "success");
        showSuccessPopup("Listing updated", "Your changes were saved successfully.");
        loadApps();
      } catch (err) {
        ui.toast(err.message || "Update failed", "error");
      } finally {
        ui.setLoading(btn, false);
      }
    });
  });

  appsGrid.querySelectorAll("button[data-upload]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const form = appsGrid.querySelector(`[data-edit-form="${btn.dataset.upload}"]`);
      if (!form) return;
      const iconFile = form.querySelector("input[name='icon']")?.files?.[0];
      const bannerFile = form.querySelector("input[name='banner']")?.files?.[0];
      const screenshotFiles = form.querySelector("input[name='screenshots']")?.files || [];
      const replaceScreens = form.querySelector("input[name='replaceScreenshots']")?.checked;

      if (!iconFile && !bannerFile && !screenshotFiles.length) {
        ui.toast("Select at least one image to upload", "error");
        return;
      }

      const formData = new FormData();
      if (iconFile) formData.append("icon", iconFile);
      if (bannerFile) formData.append("banner", bannerFile);
      if (screenshotFiles.length) {
        Array.from(screenshotFiles).forEach((file) => formData.append("screenshots", file));
      }
      formData.append("mode", replaceScreens ? "replace" : "append");

      ui.setLoading(btn, true);
      try {
        await api.postForm(`/apps/${btn.dataset.upload}/media`, formData);
        ui.toast("Media uploaded", "success");
        showSuccessPopup("Media uploaded", "Your storefront visuals are now updated.");
        await loadApps();
      } catch (err) {
        ui.toast(err.message || "Upload failed", "error");
      } finally {
        ui.setLoading(btn, false);
      }
    });
  });

  appsGrid.querySelectorAll("button[data-upload-asset]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const form = appsGrid.querySelector(`[data-edit-form="${btn.dataset.uploadAsset}"]`);
      if (!form) return;
      const file = form.querySelector("input[name='assetFile']")?.files?.[0];
      if (!file) {
        ui.toast("Select a file to upload", "error");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", form.querySelector("select[name='assetType']")?.value || "OTHER");
      formData.append("label", form.querySelector("input[name='assetLabel']")?.value || "");
      formData.append("description", form.querySelector("textarea[name='assetDescription']")?.value || "");

      ui.setLoading(btn, true);
      try {
        await api.postForm(`/apps/${btn.dataset.uploadAsset}/assets/upload`, formData);
        ui.toast("Product file uploaded", "success");
        showSuccessPopup("File uploaded", "Your product file was added successfully.");
        await loadApps();
      } catch (err) {
        ui.toast(err.message || "Asset upload failed", "error");
      } finally {
        ui.setLoading(btn, false);
      }
    });
  });

  appsGrid.querySelectorAll("button[data-delete-asset]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      ui.setLoading(btn, true);
      try {
        await api.del(`/apps/${btn.dataset.appId}/assets/${btn.dataset.deleteAsset}`);
        ui.toast("Asset deleted", "success");
        showSuccessPopup("File removed", "The selected asset has been removed.");
        await loadApps();
      } catch (err) {
        ui.toast(err.message || "Asset delete failed", "error");
      } finally {
        ui.setLoading(btn, false);
      }
    });
  });
}

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth.hasRole("DEVELOPER")) {
    ui.toast("Become a developer to create apps", "error");
    return;
  }

  const formData = Object.fromEntries(new FormData(createForm));
  const payload = {
    name: formData.name,
    description: formData.description,
    categoryId: Number(formData.categoryId),
    tags: readTagSelection(createForm)
  };

  const btn = createForm.querySelector("button");
  ui.setLoading(btn, true);
  try {
    await api.post("/apps", payload);
    ui.toast("App created", "success");
    showSuccessPopup("Listing created", "Your app was created successfully. You can now upload media and release files.");
    createForm.reset();
    setTagSelection(createForm.querySelector("[data-tag-select='create']"), []);
    loadApps();
  } catch (err) {
    ui.toast(err.message || "Create failed", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});

document.getElementById("reloadApps").addEventListener("click", () => {
  loadApps().catch((err) => ui.toast(err.message || "Load failed", "error"));
});

becomeDevBtn.addEventListener("click", async () => {
  try {
    const result = await api.post("/auth/become-developer", {});
    if (result.status === "PENDING") {
      ui.toast("Developer request submitted", "success");
      showSuccessPopup("Request submitted", "Your developer access request is now pending admin approval.");
    } else if (result.status === "APPROVED") {
      ui.toast("Developer access approved. Refresh session.", "success");
      showSuccessPopup("Access approved", "Refresh your session to continue as a developer.");
    } else {
      ui.toast("Developer request updated", "success");
      showSuccessPopup("Request updated", "Your developer request status has been updated.");
    }
    await loadDeveloperStatus();
  } catch (err) {
    ui.toast(err.message || "Request failed", "error");
  }
});

refreshDevBtn.addEventListener("click", async () => {
  try {
    const refreshed = await auth.refresh();
    if (!refreshed) {
      ui.toast("Please log in again", "error");
      window.location.href = ui.pageUrl("pages/auth/login.html");
      return;
    }
    await auth.bootstrap();
    nav.render();
    window.location.reload();
  } catch (err) {
    ui.toast(err.message || "Refresh failed", "error");
  }
});

async function loadDeveloperStatus() {
  if (!auth.isLoggedIn()) {
    devStatusText.textContent = "Login to request developer access.";
    becomeDevBtn.classList.add("hidden");
    refreshDevBtn.classList.add("hidden");
    createForm.classList.add("hidden");
    return;
  }

  try {
    becomeDevBtn.disabled = false;
    const status = await api.get("/auth/developer-status");
    const roleIsDev = auth.hasRole("DEVELOPER");

    if (roleIsDev) {
      devStatusText.textContent = "Developer access active.";
      becomeDevBtn.classList.add("hidden");
      refreshDevBtn.classList.add("hidden");
      createForm.classList.remove("hidden");
      return;
    }

    if (status.status === "PENDING") {
      devStatusText.textContent = "Developer request pending admin approval.";
      becomeDevBtn.textContent = "Request Pending";
      becomeDevBtn.disabled = true;
      becomeDevBtn.classList.remove("hidden");
      refreshDevBtn.classList.add("hidden");
      createForm.classList.add("hidden");
      return;
    }

    if (status.status === "APPROVED") {
      devStatusText.textContent = "Developer access approved. Refresh session to continue.";
      becomeDevBtn.classList.add("hidden");
      refreshDevBtn.classList.remove("hidden");
      createForm.classList.add("hidden");
      return;
    }

    devStatusText.textContent = "Request developer access to publish apps.";
    becomeDevBtn.textContent = "Request Developer Access";
    becomeDevBtn.disabled = false;
    becomeDevBtn.classList.remove("hidden");
    refreshDevBtn.classList.add("hidden");
    createForm.classList.add("hidden");
  } catch (err) {
    devStatusText.textContent = "Unable to load developer status.";
    becomeDevBtn.disabled = false;
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

document.addEventListener("click", (event) => {
  if (!event.target.closest(".tag-select")) {
    closeTagMenus();
  }
});

successClose?.addEventListener("click", hideSuccessPopup);
successOverlay?.addEventListener("click", (event) => {
  if (event.target === successOverlay) hideSuccessPopup();
});

(async () => {
  try {
    await Promise.all([loadCategories(), loadTags()]);
    initDynamicTagSelects(document);
    await loadDeveloperStatus();
    await loadApps();
  } catch (err) {
    ui.toast(err.message || "Failed to load dashboard", "error");
  }
})();
