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

  const sidebarCards = document.querySelectorAll(".sidebar-card");
  if (sidebarCards.length) {
    const base = ui.basePrefix();
    sidebarCards.forEach((card) => {
      if (card.querySelector(".sidebar-header")) return;
      const header = document.createElement("div");
      header.className = "sidebar-header";
      header.innerHTML = `
        <div class="sidebar-brand">
          <div class="logo">WH</div>
          <div class="sidebar-brand-meta">
            <strong>WebHarbour</strong>
            <span class="muted">App Store</span>
          </div>
        </div>
        <div class="sidebar-search">
          <span class="search-icon" aria-hidden="true"></span>
          <input class="input" type="search" placeholder="Search apps..." />
        </div>
        <div class="sidebar-actions">
          <a class="button ghost auth-action" data-auth="guest" href="${base}pages/auth/login.html">Sign In</a>
          <a class="button auth-action" data-auth="guest" href="${base}pages/auth/register.html">Create Account</a>
          <a class="button ghost auth-action hidden logout-link" data-auth="authed" data-action="logout" href="#">Logout</a>
        </div>
      `;
      const divider = document.createElement("div");
      divider.className = "sidebar-divider";
      card.prepend(divider);
      card.prepend(header);

      const searchInput = header.querySelector(".sidebar-search .input");
      if (searchInput) {
        searchInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            const query = String(searchInput.value || "").trim();
            if (!query) return;
            window.location.href = `${base}pages/apps/index.html?q=${encodeURIComponent(query)}`;
          }
        });
      }
    });
  }

  const isAuthed = auth.isLoggedIn();
  document.querySelectorAll("[data-auth='guest']").forEach((el) => {
    el.classList.toggle("hidden", isAuthed);
  });
  document.querySelectorAll("[data-auth='authed']").forEach((el) => {
    el.classList.toggle("hidden", !isAuthed);
  });

  document.querySelectorAll("[data-role]").forEach((el) => {
    const role = el.dataset.role;
    if (role && !auth.hasRole(role)) {
      el.classList.add("hidden");
    }
  });

  const logoutLinks = document.querySelectorAll("[data-action='logout']");
  logoutLinks.forEach((logoutLink) => {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      await auth.logout();
      const base = ui.basePrefix();
      window.location.href = `${base}index.html`;
    });
  });

  const storeRoot = document.querySelector(".store");
  const storeMain = document.querySelector(".store-main");
  if (storeRoot && storeMain) {
    if (!document.querySelector(".mobile-nav-trigger")) {
      const trigger = document.createElement("div");
      trigger.className = "mobile-nav-trigger";
      trigger.innerHTML = `
        <button class="hamburger" id="menuToggle" type="button" aria-label="Open navigation" aria-expanded="false">
          <span></span>
          <span></span>
          <span></span>
        </button>
      `;
      storeMain.prepend(trigger);
    }

    if (!document.querySelector(".store-overlay")) {
      const overlay = document.createElement("div");
      overlay.className = "store-overlay";
      storeRoot.appendChild(overlay);
    }

    const menuBtn = document.getElementById("menuToggle");
    const overlay = document.querySelector(".store-overlay");
    const closeMenu = () => {
      storeRoot.classList.remove("nav-open");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    };

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        const isOpen = storeRoot.classList.toggle("nav-open");
        menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    }

    if (overlay) {
      overlay.addEventListener("click", closeMenu);
    }

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1100) closeMenu();
    });
  }

  try {
    await api.get("/health");
  } catch {
    ui.toast("Site backend is unavailable right now. Confirm API_BASE_URL and try again.", "error");
  }
})();
