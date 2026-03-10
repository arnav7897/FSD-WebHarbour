const form = document.getElementById("registerForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const btn = form.querySelector("button");
  ui.setLoading(btn, true);
  try {
    await auth.register(data);
    ui.toast("Registration complete. Please log in.", "success");
    window.location.href = ui.pageUrl("pages/auth/login.html");
  } catch (err) {
    ui.toast(err.message || "Registration failed", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});
