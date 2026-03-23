const createForm = document.getElementById("createAppForm");
const categorySelect = document.getElementById("categorySelect");
const appsGrid = document.getElementById("appsGrid");
const becomeDevBtn = document.getElementById("becomeDev");
const refreshDevBtn = document.getElementById("refreshDev");
const devStatusText = document.getElementById("devStatusText");
let categoriesCache = [];

async function loadCategories() {
  const categories = await api.get("/categories");
  categoriesCache = Array.isArray(categories) ? categories : [];
  categorySelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
}

function renderCategoryOptions(selectedId) {
  if (!categoriesCache.length) return `<option value="">No categories</option>`;
  return categoriesCache.map(cat => {
    const isSelected = Number(selectedId) === Number(cat.id);
    return `<option value="${cat.id}"${isSelected ? " selected" : ""}>${escapeHtml(cat.name)}</option>`;
  }).join("");
}

function renderTagsValue(tags) {
  if (!Array.isArray(tags)) return "";
  return tags.map(tag => tag && tag.id).filter(Boolean).join(",");
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
  appsGrid.innerHTML = items.map(app => `
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
          <label>Tags (comma separated IDs)</label>
          <input class="input" type="text" name="tags" value="${renderTagsValue(app.tags)}" />
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
      </div>
    </div>
  `).join("");

  appsGrid.querySelectorAll("button[data-submit]").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await api.post(`/apps/${btn.dataset.submit}/submit`, {});
        ui.toast("Submitted for review", "success");
        loadApps();
      } catch (err) {
        ui.toast(err.message || "Submit failed", "error");
      }
    });
  });

  appsGrid.querySelectorAll("a[data-versions]").forEach(link => {
    link.addEventListener("click", () => {
      sessionStorage.setItem("lastAppId", link.dataset.versions);
    });
  });

  appsGrid.querySelectorAll("button[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const form = appsGrid.querySelector(`[data-edit-form="${btn.dataset.edit}"]`);
      if (form) form.classList.toggle("hidden");
    });
  });

  appsGrid.querySelectorAll("button[data-cancel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const form = appsGrid.querySelector(`[data-edit-form="${btn.dataset.cancel}"]`);
      if (form) form.classList.add("hidden");
    });
  });

  appsGrid.querySelectorAll("button[data-save]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const form = appsGrid.querySelector(`[data-edit-form="${btn.dataset.save}"]`);
      if (!form) return;
      const name = form.querySelector("input[name='name']").value.trim();
      const description = form.querySelector("textarea[name='description']").value.trim();
      const categoryId = Number(form.querySelector("select[name='categoryId']").value);
      const tagsRaw = form.querySelector("input[name='tags']").value;
      const tags = tagsRaw
        ? tagsRaw.split(",").map(t => Number(t.trim())).filter(Boolean)
        : [];

      if (!name || !description || !categoryId) {
        ui.toast("Name, description, and category are required", "error");
        return;
      }

      const payload = { name, description, categoryId, tags };
      ui.setLoading(btn, true);
      try {
        await api.patch(`/apps/${btn.dataset.save}`, payload);
        ui.toast("App updated", "success");
        loadApps();
      } catch (err) {
        ui.toast(err.message || "Update failed", "error");
      } finally {
        ui.setLoading(btn, false);
      }
    });
  });

  appsGrid.querySelectorAll("button[data-upload]").forEach(btn => {
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
        await loadApps();
      } catch (err) {
        ui.toast(err.message || "Upload failed", "error");
      } finally {
        ui.setLoading(btn, false);
      }
    });
  });
}

createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!auth.hasRole("DEVELOPER")) {
    ui.toast("Become a developer to create apps", "error");
    return;
  }
  const formData = Object.fromEntries(new FormData(createForm));
  const tags = formData.tags ? formData.tags.split(",").map(t => Number(t.trim())).filter(Boolean) : [];
  const payload = {
    name: formData.name,
    description: formData.description,
    categoryId: Number(formData.categoryId),
    tags
  };
  const btn = createForm.querySelector("button");
  ui.setLoading(btn, true);
  try {
    await api.post("/apps", payload);
    ui.toast("App created", "success");
    createForm.reset();
    loadApps();
  } catch (err) {
    ui.toast(err.message || "Create failed", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});

document.getElementById("reloadApps").addEventListener("click", () => {
  loadApps().catch(err => ui.toast(err.message || "Load failed", "error"));
});

becomeDevBtn.addEventListener("click", async () => {
  try {
    const result = await api.post("/auth/become-developer", {});
    if (result.status === "PENDING") {
      ui.toast("Developer request submitted", "success");
    } else if (result.status === "APPROVED") {
      ui.toast("Developer access approved. Refresh session.", "success");
    } else {
      ui.toast("Developer request updated", "success");
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
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

(async () => {
  try {
    await loadCategories();
    await loadDeveloperStatus();
    await loadApps();
  } catch (err) {
    ui.toast(err.message || "Failed to load dashboard", "error");
  }
})();
