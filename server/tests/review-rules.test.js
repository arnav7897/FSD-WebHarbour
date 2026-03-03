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

test('review rules: one review per user, rating validation, owner/admin permissions', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const developer = await registerAsDeveloper(baseUrl, 'review-dev');
    const userA = await registerAsUser(baseUrl, 'review-user-a');
    const userB = await registerAsUser(baseUrl, 'review-user-b');
    const admin = await loginAdmin(baseUrl);
    const categoryId = await getFirstCategoryId(baseUrl);

    const appCreate = await request(baseUrl, '/apps', {
      method: 'POST',
      token: developer.token,
      body: {
        name: `Review App ${Date.now()}`,
        description: 'Review test app',
        categoryId,
      },
    });
    assert.equal(appCreate.status, 201, JSON.stringify(appCreate.body));
    const appId = appCreate.body.id;

    const createReview = await request(baseUrl, `/apps/${appId}/reviews`, {
      method: 'POST',
      token: userA.token,
      body: { rating: 5, title: 'Great', comment: 'Works nicely' },
    });
    assert.equal(createReview.status, 201, JSON.stringify(createReview.body));
    const reviewId = createReview.body.id;

    const duplicateReview = await request(baseUrl, `/apps/${appId}/reviews`, {
      method: 'POST',
      token: userA.token,
      body: { rating: 4, title: 'Again', comment: 'Duplicate' },
    });
    assert.equal(duplicateReview.status, 409);

    const invalidRating = await request(baseUrl, `/apps/${appId}/reviews/${reviewId}`, {
      method: 'PATCH',
      token: userA.token,
      body: { rating: 6 },
    });
    assert.equal(invalidRating.status, 400);

    const forbiddenUpdate = await request(baseUrl, `/apps/${appId}/reviews/${reviewId}`, {
      method: 'PATCH',
      token: userB.token,
      body: { rating: 4 },
    });
    assert.equal(forbiddenUpdate.status, 403);

    const adminDelete = await request(baseUrl, `/apps/${appId}/reviews/${reviewId}`, {
      method: 'DELETE',
      token: admin.token,
    });
    assert.equal(adminDelete.status, 200, JSON.stringify(adminDelete.body));
  } finally {
    await stopTestServer(server);
  }
});
