const test = require('node:test');
const assert = require('node:assert/strict');

const {
  startTestServer,
  stopTestServer,
  request,
  registerAsDeveloper,
  registerAsUser,
  loginAdmin,
  getFirstCategoryId,
} = require('./helpers');

test('report flow: create report, list with filters, resolve', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const developer = await registerAsDeveloper(baseUrl, 'report-dev');
    const user = await registerAsUser(baseUrl, 'report-user');
    const admin = await loginAdmin(baseUrl);
    const categoryId = await getFirstCategoryId(baseUrl);

    const appCreate = await request(baseUrl, '/apps', {
      method: 'POST',
      token: developer.token,
      body: {
        name: `Report App ${Date.now()}`,
        description: 'Report test app',
        categoryId,
      },
    });
    assert.equal(appCreate.status, 201, JSON.stringify(appCreate.body));
    const appId = appCreate.body.id;

    const reportCreate = await request(baseUrl, '/reports', {
      method: 'POST',
      token: user.token,
      body: {
        type: 'APP',
        targetId: appId,
        reason: 'Suspicious behavior',
        description: 'Unexpected network calls',
      },
    });
    assert.equal(reportCreate.status, 201, JSON.stringify(reportCreate.body));
    assert.equal(reportCreate.body.status, 'PENDING');
    const reportId = reportCreate.body.id;

    const reportList = await request(baseUrl, '/admin/reports?status=PENDING&type=APP&page=1&limit=50', {
      method: 'GET',
      token: admin.token,
    });
    assert.equal(reportList.status, 200, JSON.stringify(reportList.body));
    assert.ok(Array.isArray(reportList.body.items));
    assert.ok(reportList.body.items.some((item) => item.id === reportId));

    const resolve = await request(baseUrl, `/admin/reports/${reportId}/resolve`, {
      method: 'PATCH',
      token: admin.token,
      body: {
        decision: 'APPROVED',
        notes: 'Confirmed issue and moderation action recorded.',
      },
    });
    assert.equal(resolve.status, 200, JSON.stringify(resolve.body));
    assert.equal(resolve.body.status, 'APPROVED');

    const resolveAgain = await request(baseUrl, `/admin/reports/${reportId}/resolve`, {
      method: 'PATCH',
      token: admin.token,
      body: {
        decision: 'REJECTED',
        notes: 'second resolve should fail',
      },
    });
    assert.equal(resolveAgain.status, 409);
  } finally {
    await stopTestServer(server);
  }
});
