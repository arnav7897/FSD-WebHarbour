const resetReq = document.getElementById("resetRequestForm");
const resetConf = document.getElementById("resetConfirmForm");

resetReq.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(resetReq));
  const btn = resetReq.querySelector("button");
  ui.setLoading(btn, true);
  try {
    await api.post("/auth/password-reset/request", data);
    ui.toast("If this email exists, we sent a reset code.", "success");
  } catch (err) {
    ui.toast(err.message || "Unable to send reset code. Try again.", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});

resetConf.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(resetConf));
  const btn = resetConf.querySelector("button");
  ui.setLoading(btn, true);
  try {
    await api.post("/auth/password-reset/confirm", data);
    ui.toast("Password updated. Sign in with your new password.", "success");
    window.location.href = ui.pageUrl("pages/auth/login.html");
  } catch (err) {
    ui.toast(err.message || "Could not reset password. Confirm your code and try again.", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});
