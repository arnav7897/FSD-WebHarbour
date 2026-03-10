const {
  createApp,
  listApps,
  getAppById,
  updateApp,
  publishApp,
  createAppVersion,
  listAppVersions,
} = require('../services/app.service');
const { uploadApk } = require('../services/upload.service');
const { createHttpError } = require('../middleware/error.middleware');
const fs = require('fs');
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

const uploadAppVersionHandler = async (req, res, next) => {
  const file = req.file;
  try {
    if (!file) {
      throw createHttpError(400, 'apk file is required');
    }
    const { version, changelog, fileSize, supportedOs } = req.body || {};
    if (!version) {
      throw createHttpError(400, 'version is required');
    }

    const uploadResult = await uploadApk(file.path, file.originalname);
    const bytes = uploadResult.bytes || 0;
    const sizeLabel = fileSize || (bytes ? `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB` : '0 MB');
    const supported = supportedOs
      ? String(supportedOs).split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const created = await createAppVersion({
      appId: req.params.id,
      userId: req.user.id,
      body: {
        version,
        changelog,
        downloadUrl: uploadResult.url,
        fileSize: sizeLabel,
        supportedOs: supported,
      },
    });

    return res.status(201).json({
      ...created,
      uploadUrl: uploadResult.url,
    });
  } catch (err) {
    return next(err);
  } finally {
    if (file && file.path) {
      fs.unlink(file.path, () => {});
    }
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
  uploadAppVersionHandler,
  downloadAppHandler,
  addFavoriteHandler,
  removeFavoriteHandler,
};
