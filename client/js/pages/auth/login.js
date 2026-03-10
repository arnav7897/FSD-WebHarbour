const form = document.getElementById("loginForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const btn = form.querySelector("button");
  ui.setLoading(btn, true);
  try {
    await auth.login(data.email, data.password);
    ui.toast("Welcome back", "success");
    window.location.href = ui.pageUrl("pages/apps/index.html");
  } catch (err) {
    ui.toast(err.message || "Login failed", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});
