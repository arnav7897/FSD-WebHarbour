const nav = (() => {
  const links = [
    { path: "index.html", label: "Home" },
    { path: "pages/apps/index.html", label: "Marketplace" },
    { path: "pages/user/favorites.html", label: "Favorites", role: "USER" },
    { path: "pages/user/settings.html", label: "Settings", role: "USER" },
    { path: "pages/developer/dashboard.html", label: "Developer", role: "DEVELOPER" },
    { path: "pages/admin/moderation.html", label: "Admin", role: "ADMIN" }
  ];

  function render() {
    const container = document.getElementById("nav");
    if (!container) return;
    const user = auth.getUser();
    const isAuthed = auth.isLoggedIn();

    const base = getBasePrefix();
    const html = `
      <div class="nav">
        <div class="nav-inner">
          <a class="brand" href="${base}index.html">WebHarbour</a>
          <div class="nav-links">
            ${links
              .filter((l) => !l.role || auth.hasRole(l.role))
              .map((l) => `<a href="${base}${l.path}" class="${isActive(l.path) ? "active" : ""}">${l.label}</a>`)
              .join("")}
            ${!isAuthed ? `<a href="${base}pages/auth/login.html">Login</a>` : ""}
            ${!isAuthed ? `<a href="${base}pages/auth/register.html">Register</a>` : ""}
            ${isAuthed ? `<a href="#" id="logoutLink">Logout</a>` : ""}
          </div>
        </div>
      </div>
    `;
    container.innerHTML = html;
    if (isAuthed) {
      const btn = document.getElementById("logoutLink");
      if (btn) btn.addEventListener("click", async (e) => {
        e.preventDefault();
        await auth.logout();
        const base = getBasePrefix();
        window.location.href = `${base}index.html`;
      });
    }
  }

  function isActive(path) {
    const current = window.location.pathname.replace(/\\/g, "/");
    return current.endsWith("/" + path) || current.endsWith(path);
  }

  function getBasePrefix() {
    const path = window.location.pathname.replace(/\\/g, "/");
    if (!path.includes("/pages/")) return "";
    const after = path.split("/pages/")[1] || "";
    const depth = after.split("/").length - 1;
    return "../".repeat(depth + 1);
  }

  return { render };
})();
