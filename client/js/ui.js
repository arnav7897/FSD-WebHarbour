const ui = (() => {
  function toast(message, type = "info") {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    if (type === "error") el.style.background = "#c23b3b";
    if (type === "success") el.style.background = "#2f8f5b";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function setLoading(target, isLoading) {
    if (!target) return;
    target.disabled = isLoading;
    target.dataset.originalText = target.dataset.originalText || target.textContent;
    target.textContent = isLoading ? "Loading..." : target.dataset.originalText;
  }

  function renderEmpty(container, message) {
    container.innerHTML = `<div class="empty">${message}</div>`;
  }

  function basePrefix() {
    const path = window.location.pathname.replace(/\\/g, "/");
    if (!path.includes("/pages/")) return "";
    const after = path.split("/pages/")[1] || "";
    const depth = after.split("/").length - 1;
    return "../".repeat(depth + 1);
  }

  function pageUrl(path) {
    return `${basePrefix()}${path}`;
  }

  return { toast, setLoading, renderEmpty, pageUrl, basePrefix };
})();
