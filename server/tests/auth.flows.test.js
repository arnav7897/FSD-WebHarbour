const test = require('node:test');
const assert = require('node:assert/strict');

const {
  startTestServer,
  stopTestServer,
  request,
  randomEmail,
  registerUser,
  loginUser,
} = require('./helpers');

test('auth flows: login, refresh, logout revoke, reset password', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const email = randomEmail('auth');
    const password = 'OldPass@123';
    const newPassword = 'NewPass@123';

    const register = await registerUser(baseUrl, {
      name: 'Auth User',
      email,
      password,
    });

    const login = await loginUser(baseUrl, { email, password });
    assert.ok(login.token);
    assert.ok(login.refreshToken);

    const refresh = await request(baseUrl, '/auth/refresh', {
      method: 'POST',
      body: { refreshToken: login.refreshToken },
    });
    assert.equal(refresh.status, 200, JSON.stringify(refresh.body));
    assert.ok(refresh.body.token);
    assert.ok(refresh.body.refreshToken);

    const logout = await request(baseUrl, '/auth/logout', {
      method: 'POST',
      body: { refreshToken: refresh.body.refreshToken },
    });
    assert.equal(logout.status, 200, JSON.stringify(logout.body));

    const refreshAfterLogout = await request(baseUrl, '/auth/refresh', {
      method: 'POST',
      body: { refreshToken: refresh.body.refreshToken },
    });
    assert.equal(refreshAfterLogout.status, 401);
    assert.equal(refreshAfterLogout.body.success, false);
    assert.equal(refreshAfterLogout.body.error.code, 'UNAUTHORIZED');

    const resetRequest = await request(baseUrl, '/auth/password-reset/request', {
      method: 'POST',
      body: { email },
    });
    assert.equal(resetRequest.status, 200, JSON.stringify(resetRequest.body));
    assert.ok(resetRequest.body.resetToken, 'resetToken missing (enable AUTH_EXPOSE_DEBUG_TOKENS)');

    const resetConfirm = await request(baseUrl, '/auth/password-reset/confirm', {
      method: 'POST',
      body: { token: resetRequest.body.resetToken, newPassword },
    });
    assert.equal(resetConfirm.status, 200, JSON.stringify(resetConfirm.body));

    const oldPasswordLogin = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    assert.equal(oldPasswordLogin.status, 401);

    const newPasswordLogin = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email, password: newPassword },
    });
    assert.equal(newPasswordLogin.status, 200, JSON.stringify(newPasswordLogin.body));
  } finally {
    await stopTestServer(server);
  }
});
