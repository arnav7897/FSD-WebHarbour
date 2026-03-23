const params = new URLSearchParams(window.location.search);
const appId = params.get("id");
const versionForm = document.getElementById("versionForm");
const versionList = document.getElementById("versionList");
const submitButton = document.getElementById("submitVersion");
const statusEl = document.getElementById("versionStatus");
const debugEl = document.getElementById("versionDebug");
let isSubmitting = false;

const buildRedirectUrl = (versionId, includeToken = false) => {
  const base = CONFIG.API_BASE_URL.replace(/\/$/, "");
  const token = includeToken ? auth.getAccessToken() : null;
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
  return `${base}/apps/${appId}/download/redirect?versionId=${versionId}${tokenParam}`;
};

async function loadVersions() {
  if (!appId) return;
  const data = await api.get(`/apps/${appId}/versions`);
  const items = Array.isArray(data) ? data : (data.items || data.versions || data.data || []);
  const sorted = [...items].sort((a, b) => {
    const aDate = new Date(a.releaseDate || a.createdAt || 0).getTime();
    const bDate = new Date(b.releaseDate || b.createdAt || 0).getTime();
    return bDate - aDate;
  });
  if (!sorted.length) return ui.renderEmpty(versionList, "No versions yet.");
  versionList.innerHTML = sorted.map(v => {
    const hasDownload = Boolean(v.downloadUrl || v.downloadPublicId);
    return `
    <div class="card">
      <div class="split-row">
        <h3>${escapeHtml(v.version)}</h3>
        <span class="badge">${formatDate(v.releaseDate || v.createdAt)}</span>
      </div>
      <p>${escapeHtml(v.changelog || "")}</p>
      <div class="toolbar" style="margin-top: 10px;">
        <span class="badge">${escapeHtml(v.fileSize || "")}</span>
        <span class="badge">${escapeHtml((v.supportedOs || []).join(", "))}</span>
        ${hasDownload ? `<button class="button secondary" data-download="${v.id}">Download ZIP</button>` : ""}
        ${hasDownload ? `<button class="button ghost" data-copy="${v.id}">Copy link</button>` : ""}
      </div>
    </div>
  `;
  }).join("");

  versionList.querySelectorAll("button[data-download]").forEach(btn => {
    btn.addEventListener("click", () => {
      const match = sorted.find(item => String(item.id) === String(btn.dataset.download));
      if (!match) {
        ui.toast("Download unavailable", "error");
        return;
      }
      window.open(buildRedirectUrl(match.id, true), "_blank", "noopener");
    });
  });

  versionList.querySelectorAll("button[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const versionId = btn.dataset.copy;
      if (!versionId) return;
      const redirectUrl = buildRedirectUrl(versionId, false);
      const copied = await copyToClipboard(redirectUrl);
      if (copied) {
        ui.toast("Download link copied", "success");
        return;
      }
      window.open(redirectUrl, "_blank", "noopener");
    });
  });
}

async function handleVersionSubmit(e) {
  if (e?.preventDefault) e.preventDefault();
  if (e?.stopPropagation) e.stopPropagation();
  if (isSubmitting) return false;
  if (!versionForm) {
    ui.toast("Version form not found", "error");
    setStatus("Version form not found.", "error");
    return false;
  }
  try {
    const snapshot = Object.fromEntries(new FormData(versionForm));
    const file = versionForm.querySelector("input[name='zip']")?.files?.[0];
    // setDebug({
    //   event: "submit",
    //   appId,
    //   snapshot,
    //   file: file ? { name: file.name, size: file.size, type: file.type } : null,
    // });
  } catch { }
  if (!appId) {
    ui.toast("Missing app id in URL", "error");
    setStatus("Missing app id in URL.", "error");
    return false;
  }
  const formData = new FormData(versionForm);
  const file = formData.get("zip");
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
  isSubmitting = true;
  ui.setLoading(btn, true);
  setStatus("Submitting version...", "info");
  try {
    if (!payload.version || !String(payload.version).trim()) {
      throw { message: "Version is required." };
    }
    if (file && file.name) {
      const uploadData = new FormData();
      uploadData.append("zip", file);
      uploadData.append("version", payload.version);
      if (payload.changelog) uploadData.append("changelog", payload.changelog);
      if (payload.fileSize) uploadData.append("fileSize", payload.fileSize);
      if (payload.supportedOs.length) uploadData.append("supportedOs", payload.supportedOs.join(","));
      const uploadResponse = await debugRequest({
        path: `/apps/${appId}/versions/upload`,
        method: "POST",
        body: uploadData,
        isForm: true,
      });
      setDebug(uploadResponse);
      ui.toast("ZIP uploaded and version created", "success");
      const uploadUrl = uploadResponse?.uploadUrl || uploadResponse?.downloadUrl;
      setStatus(uploadUrl ? `ZIP uploaded. URL: ${uploadUrl}` : "ZIP uploaded and version created.", "success");
    } else {
      if (!payload.downloadUrl) {
        throw { message: "Provide a download URL or upload a ZIP." };
      }
      const response = await debugRequest({
        path: `/apps/${appId}/versions`,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDebug(response);
      ui.toast("Version added", "success");
      setStatus("Version added.", "success");
    }
    versionForm.reset();
    await loadVersions();
  } catch (err) {
    const message = err?.message || err?.error?.message || (err?.status ? `Add version failed (${err.status})` : "Add version failed");
    ui.toast(message, "error");
    setStatus(message, "error");
    setDebug(err);
  } finally {
    isSubmitting = false;
    ui.setLoading(btn, false);
  }
  return false;
}

if (versionForm) {
  versionForm.addEventListener("submit", handleVersionSubmit);
  versionForm.addEventListener("click", (e) => {
    const target = e.target;
    setDebug({
      event: "click",
      target: target?.id || target?.name || target?.tagName || "unknown",
    });
  });
  versionForm.addEventListener("invalid", (e) => {
    const target = e.target;
    const name = target?.name || target?.id || "field";
    setStatus(`Missing or invalid field: ${name}`, "error");
    setDebug({ event: "invalid", field: name });
  }, true);
}

if (submitButton) {
  submitButton.addEventListener("click", handleVersionSubmit);
  setDebug({ event: "bind", submitButton: true, form: Boolean(versionForm) });
}

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(String(text));
      return true;
    }
  } catch { }
  return false;
}

function setStatus(message, tone = "info") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.display = "block";
  statusEl.style.borderColor = tone === "error" ? "#f3b7bd" : tone === "success" ? "#b7e1c3" : "";
  statusEl.style.background = tone === "error" ? "#fde8ea" : tone === "success" ? "#e7f7ee" : "";
  statusEl.style.color = tone === "error" ? "#8a1f2d" : tone === "success" ? "#155c2d" : "";
}

function setDebug(payload) {
  if (!debugEl) return;
  debugEl.style.display = "block";
  debugEl.dataset.persist = "true";
  try {
    debugEl.textContent = JSON.stringify(payload, null, 2);
  } catch {
    debugEl.textContent = String(payload || "");
  }
}

async function debugRequest({ path, method = "GET", body, isForm = false }) {
  const base = CONFIG.API_BASE_URL.replace(/\/$/, "");
  const url = `${base}${path}`;
  const headers = {};
  const token = auth.getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const requestInfo = { url, method, hasToken: Boolean(token), isForm };
  try {
    setDebug({ event: "request", ...requestInfo });
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    const payload = { event: "response", ...requestInfo, status: res.status, ok: res.ok, data };
    setDebug(payload);
    if (!res.ok) {
      const errorMessage = data?.error?.message || "Request failed";
      throw { status: res.status, message: errorMessage, error: data?.error };
    }
    return data;
  } catch (err) {
    const message = err?.message || (err?.name === "AbortError" ? "Request timed out" : "Request failed");
    setDebug({ event: "error", ...requestInfo, message });
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

(async () => {
  if (window.__roleDenied) return;
  if (!versionForm || !versionList) {
    setStatus("Version page failed to initialize. Missing form or list container.", "error");
    return;
  }

  setStatus(appId ? `Ready to add version for App #${appId}. API: ${CONFIG.API_BASE_URL}` : "Missing app id in URL.", appId ? "info" : "error");
  setDebug({ event: "init", appId, apiBase: CONFIG.API_BASE_URL });

  try {
    await api.get("/health");
    setStatus(`API connected. App #${appId}.`, "success");
  } catch (err) {
    const message = err?.message || err?.error?.message || "API not reachable";
    setStatus(message, "error");
  }

  if (!appId) {
    const fallbackId = sessionStorage.getItem("lastAppId");
    if (fallbackId) {
      const url = new URL(window.location.href);
      url.searchParams.set("id", fallbackId);
      window.location.replace(url.toString());
      return;
    }
    ui.renderEmpty(versionList, "Missing app id in URL. Open this page from the Developer Dashboard.");
    Array.from(versionForm.elements).forEach(el => { el.disabled = true; });
    setStatus("Missing app id in URL. Open this page from the Developer Dashboard.", "error");
    return ui.toast("Missing app id", "error");
  }
  try { await loadVersions(); } catch (err) {
    const message = err?.message || err?.error?.message || "Load failed";
    ui.toast(message, "error");
    setStatus(message, "error");
  }
})();

window.addEventListener("error", (event) => {
  if (!event?.message) return;
  setStatus(`Client error: ${event.message}`, "error");
});
