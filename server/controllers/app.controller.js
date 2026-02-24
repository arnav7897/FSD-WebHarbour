const {
  createApp,
  listApps,
  getAppById,
  updateApp,
  publishApp,
  createAppVersion,
  listAppVersions,
} = require('../services/app.service');

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

module.exports = {
  createAppHandler,
  listAppsHandler,
  getAppByIdHandler,
  updateAppHandler,
  publishAppHandler,
  createAppVersionHandler,
  listAppVersionsHandler,
};
