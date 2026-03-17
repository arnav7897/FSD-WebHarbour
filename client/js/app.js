(async () => {
  await auth.bootstrap();
  const requiredRole = document.body?.dataset?.requiresRole;
  if (requiredRole) {
    if (!auth.isLoggedIn()) {
      window.location.href = ui.pageUrl("pages/auth/login.html");
      return;
    }
    if (!auth.hasRole(requiredRole)) {
      window.__roleDenied = true;
      const main = document.querySelector("main");
      if (main) {
        const banner = document.createElement("div");
        banner.className = "empty";
        if (requiredRole === "DEVELOPER") {
          banner.textContent = "You need developer access to use this dashboard. Click “Become Developer” to continue.";
        } else {
          banner.textContent = "Access denied for this area. You can request access or switch accounts.";
        }
        main.prepend(banner);
      } else {
        ui.toast("Access denied", "error");
      }
    }
  }
  nav.render();
  try {
    await api.get("/health");
  } catch {
    ui.toast("Site backend is unavailable right now. Confirm API_BASE_URL and try again.", "error");
  }
})();
