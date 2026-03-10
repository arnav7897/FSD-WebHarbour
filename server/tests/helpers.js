const assert = require('node:assert/strict');
const http = require('node:http');

const app = require('../src/app');

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@webharbour.local').toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

const startTestServer = async () =>
  new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });

const stopTestServer = async (server) =>
  new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

const request = async (baseUrl, path, { method = 'GET', token, body } = {}) => {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (err) {
    json = { raw: text };
  }

  return { status: res.status, body: json };
};

const randomEmail = (prefix) =>
  `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2, 8)}@example.com`.toLowerCase();

const registerUser = async (baseUrl, { name, email, password }) => {
  const res = await request(baseUrl, '/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
};

const loginUser = async (baseUrl, { email, password }) => {
  const res = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
};

const registerAsDeveloper = async (baseUrl, namePrefix = 'dev') => {
  const email = randomEmail(namePrefix);
  const password = 'Pass@12345';
  await registerUser(baseUrl, {
    name: `${namePrefix}-user`,
    email,
    password,
  });
  const login = await loginUser(baseUrl, { email, password });

  await request(baseUrl, '/auth/become-developer', {
    method: 'POST',
    token: login.token,
  });

  const admin = await loginAdmin(baseUrl);
  await request(baseUrl, `/admin/developers/${login.user.id}/approve`, {
    method: 'PATCH',
    token: admin.token,
  });

  const refreshed = await request(baseUrl, '/auth/refresh', {
    method: 'POST',
    body: { refreshToken: login.refreshToken },
  });
  if (refreshed.status !== 200) {
    throw new Error(`Failed to refresh token after developer approval: ${JSON.stringify(refreshed.body)}`);
  }

  return {
    email,
    password,
    token: refreshed.body.token,
    refreshToken: refreshed.body.refreshToken,
    user: refreshed.body.user,
  };
};

const registerAsUser = async (baseUrl, namePrefix = 'user') => {
  const email = randomEmail(namePrefix);
  const password = 'Pass@12345';
  await registerUser(baseUrl, {
    name: `${namePrefix}-user`,
    email,
    password,
  });
  const login = await loginUser(baseUrl, { email, password });
  return {
    email,
    password,
    token: login.token,
    refreshToken: login.refreshToken,
    user: login.user,
  };
};

const loginAdmin = async (baseUrl) => {
  const login = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  assert.equal(
    login.status,
    200,
    `Admin login failed. Run 'npm run seed'. Response: ${JSON.stringify(login.body)}`,
  );

  return login.body;
};

const getFirstCategoryId = async (baseUrl) => {
  const categories = await request(baseUrl, '/categories');
  assert.equal(categories.status, 200, JSON.stringify(categories.body));
  assert.ok(Array.isArray(categories.body), 'categories response must be an array');
  assert.ok(categories.body.length > 0, 'No categories found. Run npm run seed.');
  return categories.body[0].id;
};

module.exports = {
  startTestServer,
  stopTestServer,
  request,
  randomEmail,
  registerUser,
  loginUser,
  registerAsDeveloper,
  registerAsUser,
  loginAdmin,
  getFirstCategoryId,
};
