const createForm = document.getElementById("createAppForm");
const categorySelect = document.getElementById("categorySelect");
const appsGrid = document.getElementById("appsGrid");
const becomeDevBtn = document.getElementById("becomeDev");
const refreshDevBtn = document.getElementById("refreshDev");
const devStatusText = document.getElementById("devStatusText");

let categoriesCache = [];
let tagsCache = [];

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

  ui.renderCardSkeletons(appsGrid, 3);

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
        <a class="button ghost" href="${ui.pageUrl(`pages/developer/edit.html?id=${app.id}`)}">Edit</a>
      </div>
    </div>
  `).join("");

  appsGrid.querySelectorAll("button[data-submit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api.post(`/apps/${btn.dataset.submit}/submit`, {});
        ui.toast("Submitted for review", "success");
        ui.success("Your app listing has been forwarded for moderation.", "Sent for review");
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
    ui.success("Your app was created successfully. You can now upload media and release files.", "Listing created");
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
      ui.success("Your developer access request is now pending admin approval.", "Request submitted");
    } else if (result.status === "APPROVED") {
      ui.toast("Developer access approved. Refresh session.", "success");
      ui.success("Refresh your session to continue as a developer.", "Access approved");
    } else {
      ui.toast("Developer request updated", "success");
      ui.success("Your developer request status has been updated.", "Request updated");
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
