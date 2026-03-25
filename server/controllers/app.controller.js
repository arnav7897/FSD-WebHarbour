const {
  createApp,
  listApps,
  getAppById,
  updateApp,
  updateAppMedia,
  publishApp,
  createAppVersion,
  listAppVersions,
  getVersionDownloadInfo,
} = require('../services/app.service');
const {
  createAppAsset,
  listAppAssets,
  getAppAssetDownloadInfo,
  deleteAppAsset,
} = require('../services/app-asset.service');
const { uploadImage } = require('../services/upload.service');
const { storeVersionArchive, storeAppAssetFile } = require('../services/storage/file-storage.service');
const { createHttpError } = require('../middleware/error.middleware');
const fs = require('fs');
const path = require('path');
const { submitAppForReview } = require('../services/moderation.service');
const {
  createDownloadRecord,
  addFavorite,
  removeFavorite,
} = require('../services/engagement.service');
const { verifyToken } = require('../utlis/jwt');

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
    const result = await listApps(req.query, req.user);
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

const uploadAppMediaHandler = async (req, res, next) => {
  const files = req.files || {};
  const iconFile = files.icon?.[0];
  const bannerFile = files.banner?.[0];
  const screenshotFiles = files.screenshots || [];

  const allFiles = [iconFile, bannerFile, ...screenshotFiles].filter(Boolean);

  const ensureImageFile = (file) => {
    if (!file) return;
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      throw createHttpError(400, 'Only image uploads are allowed');
    }
  };

  try {
    if (!allFiles.length) {
      throw createHttpError(400, 'At least one media file is required');
    }

    allFiles.forEach(ensureImageFile);

    const mode = String(req.body?.mode || req.query?.mode || '').toLowerCase();
    const screenshotMode = mode === 'replace' ? 'replace' : 'append';

    let iconUrl;
    let bannerUrl;
    let screenshotUrls;

    if (iconFile) {
      const result = await uploadImage(iconFile.path, iconFile.originalname, {
        folder: 'webharbour/apps/icons',
      });
      iconUrl = result.url;
    }

    if (bannerFile) {
      const result = await uploadImage(bannerFile.path, bannerFile.originalname, {
        folder: 'webharbour/apps/banners',
      });
      bannerUrl = result.url;
    }

    if (screenshotFiles.length) {
      const results = await Promise.all(
        screenshotFiles.map((file) =>
          uploadImage(file.path, file.originalname, {
            folder: 'webharbour/apps/screenshots',
          }),
        ),
      );
      screenshotUrls = results.map((result) => result.url).filter(Boolean);
    }

    const updated = await updateAppMedia({
      appId: req.params.id,
      userId: req.user.id,
      iconUrl,
      bannerUrl,
      screenshotUrls,
      screenshotMode,
    });

    return res.json({
      ...updated,
      uploaded: {
        iconUrl: iconUrl || null,
        bannerUrl: bannerUrl || null,
        screenshots: screenshotUrls || [],
      },
    });
  } catch (err) {
    return next(err);
  } finally {
    allFiles.forEach((file) => {
      if (file?.path) {
        fs.unlink(file.path, () => { });
      }
    });
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
      throw createHttpError(400, 'zip file is required');
    }
    const { version, changelog, fileSize, supportedOs } = req.body || {};
    if (!version) {
      throw createHttpError(400, 'version is required');
    }

    const uploadResult = await storeVersionArchive({ file, appId: req.params.id });
    const downloadUrl = uploadResult.storageObjectUrl || `${String(uploadResult.storageProvider || 'LOCAL').toLowerCase()}://${uploadResult.storageBucket ? `${uploadResult.storageBucket}/` : ''}${uploadResult.storageKey || path.basename(file.originalname || 'download.zip')}`;
    if (!downloadUrl) {
      throw createHttpError(500, 'ZIP uploaded but no download URL was returned.');
    }
    const bytes = uploadResult.byteSize || 0;
    const sizeLabel = fileSize || (bytes ? `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB` : '0 MB');
    const supported = supportedOs
      ? String(supportedOs).split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const parsedExt = path.extname(file.originalname || '');
    const downloadFormat = parsedExt ? parsedExt.slice(1).toLowerCase() : null;

    const created = await createAppVersion({
      appId: req.params.id,
      userId: req.user.id,
      body: {
        version,
        changelog,
        downloadUrl,
        downloadPublicId: null,
        downloadFormat,
        downloadFilename: file.originalname || null,
        storageProvider: uploadResult.storageProvider,
        storageBucket: uploadResult.storageBucket,
        storageKey: uploadResult.storageKey,
        storageObjectUrl: uploadResult.storageObjectUrl,
        mimeType: uploadResult.mimeType,
        fileSize: sizeLabel,
        supportedOs: supported,
      },
    });

    return res.status(201).json({
      ...created,
      uploadUrl: uploadResult.storageObjectUrl || downloadUrl,
    });
  } catch (err) {
    return next(err);
  } finally {
    if (file && file.path) {
      fs.unlink(file.path, () => { });
    }
  }
};

const uploadAppAssetHandler = async (req, res, next) => {
  const file = req.file;
  try {
    if (!file) {
      throw createHttpError(400, 'file is required');
    }

    const storage = await storeAppAssetFile({ file, appId: req.params.id });
    const asset = await createAppAsset({
      appId: req.params.id,
      userId: req.user.id,
      file,
      storage,
      body: req.body,
    });

    return res.status(201).json(asset);
  } catch (err) {
    return next(err);
  } finally {
    if (file?.path) {
      fs.unlink(file.path, () => { });
    }
  }
};

const listAppAssetsHandler = async (req, res, next) => {
  try {
    const assets = await listAppAssets({ appId: req.params.id });
    return res.json(assets);
  } catch (err) {
    return next(err);
  }
};

const downloadAppAssetHandler = async (req, res, next) => {
  try {
    const result = await getAppAssetDownloadInfo({
      appId: req.params.id,
      assetId: req.params.assetId,
    });
    return res.redirect(result.downloadUrl);
  } catch (err) {
    return next(err);
  }
};

const deleteAppAssetHandler = async (req, res, next) => {
  try {
    const result = await deleteAppAsset({
      appId: req.params.id,
      assetId: req.params.assetId,
      userId: req.user.id,
    });
    return res.json(result);
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

const downloadAppRedirectHandler = async (req, res, next) => {
  try {
    if (!req.user && req.query?.token) {
      try {
        req.user = verifyToken(String(req.query.token));
      } catch (err) {
        return next(createHttpError(401, 'Invalid token', 'AUTH_TOKEN_INVALID'));
      }
    }

    const versionInfo = await getVersionDownloadInfo({
      appId: req.params.id,
      versionId: req.query.versionId,
    });

    if (req.user && req.user.id) {
      await createDownloadRecord({
        appId: req.params.id,
        userId: req.user.id,
        body: { versionId: versionInfo.versionId },
        requestMeta: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    }

    return res.redirect(versionInfo.downloadUrl);
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
  uploadAppMediaHandler,
  publishAppHandler,
  submitAppHandler,
  createAppVersionHandler,
  listAppVersionsHandler,
  uploadAppVersionHandler,
  uploadAppAssetHandler,
  listAppAssetsHandler,
  downloadAppAssetHandler,
  deleteAppAssetHandler,
  downloadAppHandler,
  downloadAppRedirectHandler,
  addFavoriteHandler,
  removeFavoriteHandler,
};
