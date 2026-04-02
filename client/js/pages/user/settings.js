const btn = document.getElementById("logoutAll");
btn.addEventListener("click", async () => {
  try {
    if (window.__roleDenied) return;
    await api.post("/auth/logout-all", {});
    await auth.logout();
    ui.toast("Logged out everywhere", "success");
    ui.success("You have been logged out on all devices.", "Logged out");
    window.setTimeout(() => {
      window.location.href = ui.pageUrl("index.html");
    }, 900);
  } catch (err) {
    ui.toast(err.message || "Failed to logout", "error");
  }
});
