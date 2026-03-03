const test = require('node:test');
const assert = require('node:assert/strict');

const {
  startTestServer,
  stopTestServer,
  request,
  registerAsDeveloper,
  loginAdmin,
  getFirstCategoryId,
} = require('./helpers');

test('app lifecycle moderation transitions', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const developer = await registerAsDeveloper(baseUrl, 'lifecycle-dev');
    const admin = await loginAdmin(baseUrl);
    const categoryId = await getFirstCategoryId(baseUrl);

    const create = await request(baseUrl, '/apps', {
      method: 'POST',
      token: developer.token,
      body: {
        name: `Lifecycle App ${Date.now()}`,
        description: 'Lifecycle test app',
        categoryId,
      },
    });
    assert.equal(create.status, 201, JSON.stringify(create.body));
    assert.equal(create.body.status, 'DRAFT');

    const appId = create.body.id;

    const submit = await request(baseUrl, `/apps/${appId}/submit`, {
      method: 'POST',
      token: developer.token,
    });
    assert.equal(submit.status, 200, JSON.stringify(submit.body));
    assert.equal(submit.body.status, 'UNDER_REVIEW');

    const submitAgain = await request(baseUrl, `/apps/${appId}/submit`, {
      method: 'POST',
      token: developer.token,
    });
    assert.equal(submitAgain.status, 409);

    const approve = await request(baseUrl, `/admin/apps/${appId}/approve`, {
      method: 'PATCH',
      token: admin.token,
      body: { note: 'Looks good' },
    });
    assert.equal(approve.status, 200, JSON.stringify(approve.body));
    assert.equal(approve.body.status, 'PUBLISHED');

    const suspend = await request(baseUrl, `/admin/apps/${appId}/suspend`, {
      method: 'PATCH',
      token: admin.token,
      body: { reason: 'Policy check required' },
    });
    assert.equal(suspend.status, 200, JSON.stringify(suspend.body));
    assert.equal(suspend.body.status, 'SUSPENDED');

    const unsuspend = await request(baseUrl, `/admin/apps/${appId}/unsuspend`, {
      method: 'PATCH',
      token: admin.token,
      body: { note: 'Issue resolved' },
    });
    assert.equal(unsuspend.status, 200, JSON.stringify(unsuspend.body));
    assert.equal(unsuspend.body.status, 'PUBLISHED');
  } finally {
    await stopTestServer(server);
  }
});
