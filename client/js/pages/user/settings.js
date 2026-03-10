const btn = document.getElementById("logoutAll");
btn.addEventListener("click", async () => {
  try {
    if (window.__roleDenied) return;
    await api.post("/auth/logout-all", {});
    await auth.logout();
    ui.toast("Logged out everywhere", "success");
    window.location.href = ui.pageUrl("index.html");
  } catch (err) {
    ui.toast(err.message || "Failed to logout", "error");
  }
});
