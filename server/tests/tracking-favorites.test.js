const test = require('node:test');
const assert = require('node:assert/strict');

const {
  startTestServer,
  stopTestServer,
  request,
  registerAsDeveloper,
  registerAsUser,
  getFirstCategoryId,
} = require('./helpers');

test('tracking and favorites: duplicate-safe favorite + idempotent remove + download record', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const developer = await registerAsDeveloper(baseUrl, 'track-dev');
    const user = await registerAsUser(baseUrl, 'track-user');
    const categoryId = await getFirstCategoryId(baseUrl);

    const appCreate = await request(baseUrl, '/apps', {
      method: 'POST',
      token: developer.token,
      body: {
        name: `Tracking App ${Date.now()}`,
        description: 'Tracking test app',
        categoryId,
      },
    });
    assert.equal(appCreate.status, 201, JSON.stringify(appCreate.body));
    const appId = appCreate.body.id;

    const versionCreate = await request(baseUrl, `/apps/${appId}/versions`, {
      method: 'POST',
      token: developer.token,
      body: {
        version: '1.0.0',
        downloadUrl: `https://example.com/download/${Date.now()}.zip`,
        fileSize: '20 MB',
      },
    });
    assert.equal(versionCreate.status, 201, JSON.stringify(versionCreate.body));

    const addFavorite = await request(baseUrl, `/apps/${appId}/favorite`, {
      method: 'POST',
      token: user.token,
    });
    assert.equal(addFavorite.status, 201, JSON.stringify(addFavorite.body));

    const addFavoriteAgain = await request(baseUrl, `/apps/${appId}/favorite`, {
      method: 'POST',
      token: user.token,
    });
    assert.equal(addFavoriteAgain.status, 409);

    const download = await request(baseUrl, `/apps/${appId}/download`, {
      method: 'POST',
      token: user.token,
    });
    assert.equal(download.status, 201, JSON.stringify(download.body));
    assert.equal(download.body.appId, appId);

    const removeFavorite = await request(baseUrl, `/apps/${appId}/favorite`, {
      method: 'DELETE',
      token: user.token,
    });
    assert.equal(removeFavorite.status, 200, JSON.stringify(removeFavorite.body));
    assert.equal(removeFavorite.body.removed, true);

    const removeFavoriteAgain = await request(baseUrl, `/apps/${appId}/favorite`, {
      method: 'DELETE',
      token: user.token,
    });
    assert.equal(removeFavoriteAgain.status, 200, JSON.stringify(removeFavoriteAgain.body));
    assert.equal(removeFavoriteAgain.body.removed, false);

    const listFavorites = await request(baseUrl, '/users/me/favorites', {
      method: 'GET',
      token: user.token,
    });
    assert.equal(listFavorites.status, 200, JSON.stringify(listFavorites.body));
    assert.ok(Array.isArray(listFavorites.body));
    assert.equal(listFavorites.body.length, 0);
  } finally {
    await stopTestServer(server);
  }
});
