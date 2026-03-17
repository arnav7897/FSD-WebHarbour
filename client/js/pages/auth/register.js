const form = document.getElementById("registerForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const btn = form.querySelector("button");
  ui.setLoading(btn, true);
  try {
    await auth.register(data);
    ui.toast("Account created. Sign in to continue.", "success");
    window.location.href = ui.pageUrl("pages/auth/login.html");
  } catch (err) {
    ui.toast(err.message || "Could not create account. Try again shortly.", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});
