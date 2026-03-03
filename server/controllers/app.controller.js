const {
  createApp,
  listApps,
  getAppById,
  updateApp,
  publishApp,
  createAppVersion,
  listAppVersions,
} = require('../services/app.service');
const { submitAppForReview } = require('../services/moderation.service');
const {
  createDownloadRecord,
  addFavorite,
  removeFavorite,
} = require('../services/engagement.service');

const createAppHandler = async (req, res, next) => {
  try {
    const app = await createApp({ userId: req.user.id, body: req.body });
    return res.status(201).json(app);
  } catch (err) {
    return next(err);
  }
};

const listAppsHandler = async (req, res, next) => {
  try {
    const result = await listApps(req.query);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const getAppByIdHandler = async (req, res, next) => {
  try {
    const app = await getAppById(req.params.id);
    return res.json(app);
  } catch (err) {
    return next(err);
  }
};

const updateAppHandler = async (req, res, next) => {
  try {
    const app = await updateApp({ appId: req.params.id, userId: req.user.id, body: req.body });
    return res.json(app);
  } catch (err) {
    return next(err);
  }
};

const publishAppHandler = async (req, res, next) => {
  try {
    const app = await publishApp({ appId: req.params.id, userId: req.user.id });
    return res.json(app);
  } catch (err) {
    return next(err);
  }
};

const submitAppHandler = async (req, res, next) => {
  try {
    const app = await submitAppForReview({ appId: req.params.id, userId: req.user.id });
    return res.json(app);
  } catch (err) {
    return next(err);
  }
};

const createAppVersionHandler = async (req, res, next) => {
  try {
    const version = await createAppVersion({
      appId: req.params.id,
      userId: req.user.id,
      body: req.body,
    });
    return res.status(201).json(version);
  } catch (err) {
    return next(err);
  }
};

const listAppVersionsHandler = async (req, res, next) => {
  try {
    const versions = await listAppVersions(req.params.id);
    return res.json(versions);
  } catch (err) {
    return next(err);
  }
};

const downloadAppHandler = async (req, res, next) => {
  try {
    const result = await createDownloadRecord({
      appId: req.params.id,
      userId: req.user.id,
      body: req.body,
      requestMeta: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

const addFavoriteHandler = async (req, res, next) => {
  try {
    const result = await addFavorite({
      appId: req.params.id,
      userId: req.user.id,
    });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

const removeFavoriteHandler = async (req, res, next) => {
  try {
    const result = await removeFavorite({
      appId: req.params.id,
      userId: req.user.id,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createAppHandler,
  listAppsHandler,
  getAppByIdHandler,
  updateAppHandler,
  publishAppHandler,
  submitAppHandler,
  createAppVersionHandler,
  listAppVersionsHandler,
  downloadAppHandler,
  addFavoriteHandler,
  removeFavoriteHandler,
};
