const params = new URLSearchParams(window.location.search);
const appId = params.get("id");
const versionForm = document.getElementById("versionForm");
const versionList = document.getElementById("versionList");

async function loadVersions() {
  const data = await api.get(`/apps/${appId}/versions`);
  const items = data.items || data.versions || data.data || [];
  if (!items.length) return ui.renderEmpty(versionList, "No versions yet.");
  versionList.innerHTML = items.map(v => `
    <div class="card">
      <h3>${escapeHtml(v.version)}</h3>
      <p>${escapeHtml(v.changelog || "")}</p>
      <div class="toolbar" style="margin-top: 10px;">
        <span class="badge">${escapeHtml(v.fileSize || "")}</span>
        <span class="badge">${escapeHtml((v.supportedOs || []).join(", "))}</span>
      </div>
    </div>
  `).join("");
}

versionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(versionForm);
  const file = formData.get("apk");
  const payload = {
    version: formData.get("version"),
    changelog: formData.get("changelog"),
    downloadUrl: formData.get("downloadUrl"),
    fileSize: formData.get("fileSize"),
    supportedOs: formData.get("supportedOs")
      ? String(formData.get("supportedOs")).split(",").map(s => s.trim()).filter(Boolean)
      : []
  };
  const btn = versionForm.querySelector("button");
  ui.setLoading(btn, true);
  try {
    if (file && file.name) {
      const uploadData = new FormData();
      uploadData.append("apk", file);
      uploadData.append("version", payload.version);
      if (payload.changelog) uploadData.append("changelog", payload.changelog);
      if (payload.fileSize) uploadData.append("fileSize", payload.fileSize);
      if (payload.supportedOs.length) uploadData.append("supportedOs", payload.supportedOs.join(","));
      await api.postForm(`/apps/${appId}/versions/upload`, uploadData);
      ui.toast("APK uploaded and version created", "success");
    } else {
      if (!payload.downloadUrl) {
        throw { message: "Provide a download URL or upload an APK." };
      }
      await api.post(`/apps/${appId}/versions`, payload);
      ui.toast("Version added", "success");
    }
    versionForm.reset();
    loadVersions();
  } catch (err) {
    ui.toast(err.message || "Add version failed", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

(async () => {
  if (window.__roleDenied) return;
  if (!appId) return ui.toast("Missing app id", "error");
  try { await loadVersions(); } catch (err) { ui.toast(err.message || "Load failed", "error"); }
})();
