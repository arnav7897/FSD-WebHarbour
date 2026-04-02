const form = document.getElementById("loginForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const btn = form.querySelector("button");
  ui.setLoading(btn, true);
  try {
    await auth.login(data.email, data.password);
    ui.toast("Logged in. You’re ready to browse apps.", "success");
    ui.success("You are ready to browse apps.", "Logged in");
    window.setTimeout(() => {
      window.location.href = ui.pageUrl("pages/apps/index.html");
    }, 900);
  } catch (err) {
    ui.toast(err.message || "Could not sign in. Check your email and password.", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});
