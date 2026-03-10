const createForm = document.getElementById("createAppForm");
const categorySelect = document.getElementById("categorySelect");
const appsGrid = document.getElementById("appsGrid");
const becomeDevBtn = document.getElementById("becomeDev");
const refreshDevBtn = document.getElementById("refreshDev");
const devStatusText = document.getElementById("devStatusText");

async function loadCategories() {
  const categories = await api.get("/categories");
  categorySelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
}

async function loadApps() {
  if (!auth.hasRole("DEVELOPER")) {
    ui.renderEmpty(appsGrid, "Become a developer to manage your apps here.");
    return;
  }
  const status = document.getElementById("statusFilter").value;
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", 12);
  const data = await api.get(`/apps?${params.toString()}`);
  const items = data.items || data.apps || data.data || [];
  if (!items.length) return ui.renderEmpty(appsGrid, "No apps found.");
  appsGrid.innerHTML = items.map(app => `
    <div class="card">
      <h3>${escapeHtml(app.name)}</h3>
      <p>${escapeHtml(app.description || "")}</p>
      <div class="toolbar" style="margin-top: 12px;">
        <span class="badge">${app.status}</span>
        <a class="button secondary" href="/pages/developer/versions.html?id=${app.id}">Versions</a>
        <a class="button ghost" href="/pages/developer/analytics.html?id=${app.id}">Analytics</a>
        <button class="button" data-submit="${app.id}">Submit</button>
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
