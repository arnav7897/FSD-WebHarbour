const resetReq = document.getElementById("resetRequestForm");
const resetConf = document.getElementById("resetConfirmForm");

resetReq.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(resetReq));
  const btn = resetReq.querySelector("button");
  ui.setLoading(btn, true);
  try {
    await api.post("/auth/password-reset/request", data);
    ui.toast("Reset token sent", "success");
  } catch (err) {
    ui.toast(err.message || "Request failed", "error");
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
    ui.toast("Password reset", "success");
    window.location.href = ui.pageUrl("pages/auth/login.html");
  } catch (err) {
    ui.toast(err.message || "Reset failed", "error");
  } finally {
    ui.setLoading(btn, false);
  }
});
