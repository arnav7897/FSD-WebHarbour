const ui = (() => {
  let successModal;
  let successTimer;

  function ensureSuccessModal() {
    if (successModal) return successModal;

    const overlay = document.createElement("div");
    overlay.className = "success-overlay hidden";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="success-popup">
        <div class="success-badge">
          <span class="success-badge-ring"></span>
          <span class="success-badge-check">&#10003;</span>
        </div>
        <h3 data-success-title>Successfully done</h3>
        <p data-success-message>Your action was completed successfully.</p>
        <button class="button" type="button" data-success-close>Continue</button>
      </div>
    `;

    const hide = () => {
      overlay.classList.remove("is-visible");
      overlay.setAttribute("aria-hidden", "true");
      window.setTimeout(() => {
        if (!overlay.classList.contains("is-visible")) overlay.classList.add("hidden");
      }, 220);
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) hide();
    });
    overlay.querySelector("[data-success-close]")?.addEventListener("click", hide);

    document.body.appendChild(overlay);
    successModal = { overlay, hide };
    return successModal;
  }

  function toast(message, type = "info") {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    if (type === "error") el.style.background = "#c23b3b";
    if (type === "success") el.style.background = "#2f8f5b";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function success(message, title = "Successfully done", duration = 2400) {
    const modal = ensureSuccessModal();
    const titleEl = modal.overlay.querySelector("[data-success-title]");
    const messageEl = modal.overlay.querySelector("[data-success-message]");
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (successTimer) window.clearTimeout(successTimer);
    modal.overlay.classList.remove("hidden");
    modal.overlay.classList.add("is-visible");
    modal.overlay.setAttribute("aria-hidden", "false");
    successTimer = window.setTimeout(() => modal.hide(), duration);
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

  function renderCardSkeletons(container, count = 3) {
    if (!container) return;
    container.innerHTML = Array.from({ length: count }, () => `
      <div class="card skeleton-card">
        <div class="skeleton-line lg skeleton"></div>
        <div class="skeleton-line md skeleton"></div>
        <div class="skeleton-line sm skeleton"></div>
      </div>
    `).join("");
  }

  function renderRowSkeletons(container, count = 4) {
    if (!container) return;
    container.innerHTML = Array.from({ length: count }, () => `
      <div class="app-card skeleton-card">
        <div class="app-icon skeleton"></div>
        <div>
          <div class="skeleton-line lg skeleton"></div>
          <div class="skeleton-line md skeleton"></div>
        </div>
      </div>
    `).join("");
  }

  function renderTableSkeleton(table, rows = 5, cols = 5) {
    if (!table) return;
    const head = Array.from({ length: cols }, () => "<th><div class=\"skeleton-line sm skeleton\"></div></th>").join("");
    const body = Array.from({ length: rows }, () => `
      <tr>${Array.from({ length: cols }, () => "<td><div class=\"skeleton-line sm skeleton\"></div></td>").join("")}</tr>
    `).join("");
    table.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
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

  function assetUrl(url) {
    if (!url) return "";
    const trimmed = String(url).trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("/")) {
      return `${CONFIG.API_BASE_URL.replace(/\/$/, "")}${trimmed}`;
    }
    return trimmed;
  }

  return { toast, success, setLoading, renderEmpty, renderCardSkeletons, renderRowSkeletons, renderTableSkeleton, pageUrl, basePrefix, assetUrl };
})();
