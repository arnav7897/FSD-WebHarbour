(() => {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  const root = document.body;
  const storageKey = "wh-theme";

  const applyTheme = (mode) => {
    if (mode) {
      root.dataset.theme = mode;
    } else {
      delete root.dataset.theme;
    }
    toggle.textContent = mode === "dark" ? "Light mode" : "Dark mode";
    toggle.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
  };

  const stored = localStorage.getItem(storageKey);
  if (stored === "dark") {
    applyTheme("dark");
  } else {
    applyTheme("");
  }

  toggle.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "" : "dark";
    if (next) {
      localStorage.setItem(storageKey, next);
    } else {
      localStorage.removeItem(storageKey);
    }
    applyTheme(next);
  });
})();
