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

const verifyEmail = async (baseUrl, token) => {
  const res = await request(baseUrl, '/auth/verify-email/confirm', {
    method: 'POST',
    body: { token },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
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

const registerVerifyLogin = async (baseUrl, { name, email, password }) => {
  const register = await registerUser(baseUrl, { name, email, password });
  assert.ok(
    register.verificationToken,
    'verificationToken missing. Set AUTH_EXPOSE_DEBUG_TOKENS=true for tests.',
  );
  await verifyEmail(baseUrl, register.verificationToken);
  return loginUser(baseUrl, { email, password });
};

const registerAsDeveloper = async (baseUrl, namePrefix = 'dev') => {
  const email = randomEmail(namePrefix);
  const password = 'Pass@12345';
  const login = await registerVerifyLogin(baseUrl, {
    name: `${namePrefix}-user`,
    email,
    password,
  });

  const upgraded = await request(baseUrl, '/auth/become-developer', {
    method: 'POST',
    token: login.token,
  });
  assert.equal(upgraded.status, 200, JSON.stringify(upgraded.body));

  return {
    email,
    password,
    token: upgraded.body.token,
    refreshToken: upgraded.body.refreshToken,
    user: upgraded.body.user,
  };
};

const registerAsUser = async (baseUrl, namePrefix = 'user') => {
  const email = randomEmail(namePrefix);
  const password = 'Pass@12345';
  const login = await registerVerifyLogin(baseUrl, {
    name: `${namePrefix}-user`,
    email,
    password,
  });
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
  verifyEmail,
  loginUser,
  registerVerifyLogin,
  registerAsDeveloper,
  registerAsUser,
  loginAdmin,
  getFirstCategoryId,
};
