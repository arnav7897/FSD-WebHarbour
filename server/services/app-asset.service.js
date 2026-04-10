const path = require('path');
const prisma = require('../config/db');
const { createHttpError } = require('../middleware/error.middleware');
const { buildDownloadTarget, deleteStoredObject } = require('./storage/file-storage.service');

const parseInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const ASSET_TYPES = new Set(['DOCUMENT', 'GUIDE', 'LICENSE', 'ARCHIVE', 'ATTACHMENT', 'OTHER']);

const mapAppAsset = (asset) => ({
  id: asset.id,
  appId: asset.appId,
  assetType: asset.assetType,
  label: asset.label,
  description: asset.description,
  filename: asset.filename,
  mimeType: asset.mimeType,
  byteSize: Number(asset.byteSize || 0),
  downloadPath: `/apps/${asset.appId}/assets/${asset.id}/download`,
  createdAt: asset.createdAt,
});

const assertAppExists = async (appId) => {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      developer: {
        select: { userId: true },
      },
    },
  });
  if (!app) throw createHttpError(404, 'App not found');
  return app;
};

const assertOwnership = async (appId, userId) => {
  const app = await assertAppExists(appId);
  if (!app.developer || app.developer.userId !== userId) {
    throw createHttpError(403, 'You can only manage assets for your own apps');
  }
  return app;
};

const normalizeAssetType = (assetType) => {
  const normalized = String(assetType || 'OTHER').trim().toUpperCase();
  if (!ASSET_TYPES.has(normalized)) {
    throw createHttpError(400, `assetType must be one of: ${Array.from(ASSET_TYPES).join(', ')}`);
  }
  return normalized;
};

const createAppAsset = async ({ appId, userId, file, storage, body }) => {
  const parsedAppId = parseInteger(appId);
  if (!parsedAppId) throw createHttpError(400, 'Invalid app id');
  await assertOwnership(parsedAppId, userId);

  const asset = await prisma.appAsset.create({
    data: {
      appId: parsedAppId,
      uploadedById: userId,
      storageProvider: storage.storageProvider,
      storageBucket: storage.storageBucket,
      storageKey: storage.storageKey,
      storageObjectUrl: storage.storageObjectUrl,
      filename: file.originalname || file.filename || 'asset',
      mimeType: storage.mimeType || file.mimetype || 'application/octet-stream',
      fileExtension: path.extname(file.originalname || file.filename || '').replace(/^\./, '').toLowerCase() || null,
      byteSize: BigInt(storage.byteSize || file.size || 0),
      assetType: normalizeAssetType(body?.assetType),
      label: body?.label ? String(body.label).trim() : null,
      description: body?.description ? String(body.description).trim() : null,
    },
  });

  return mapAppAsset(asset);
};

const listAppAssets = async ({ appId }) => {
  const parsedAppId = parseInteger(appId);
  if (!parsedAppId) throw createHttpError(400, 'Invalid app id');
  await assertAppExists(parsedAppId);
  const assets = await prisma.appAsset.findMany({
    where: { appId: parsedAppId },
    orderBy: { createdAt: 'desc' },
  });
  return assets.map(mapAppAsset);
};

const getAppAssetDownloadInfo = async ({ appId, assetId }) => {
  const parsedAppId = parseInteger(appId);
  const parsedAssetId = parseInteger(assetId);
  if (!parsedAppId || !parsedAssetId) throw createHttpError(400, 'Invalid app or asset id');

  const asset = await prisma.appAsset.findFirst({
    where: { id: parsedAssetId, appId: parsedAppId },
  });
  if (!asset) throw createHttpError(404, 'Asset not found');

  const downloadUrl = await buildDownloadTarget({
    storageProvider: asset.storageProvider,
    storageBucket: asset.storageBucket,
    storageKey: asset.storageKey,
    storageObjectUrl: asset.storageObjectUrl,
    filename: asset.filename,
    mimeType: asset.mimeType,
  });

  return { asset, downloadUrl };
};

const deleteAppAsset = async ({ appId, assetId, userId }) => {
  const parsedAppId = parseInteger(appId);
  const parsedAssetId = parseInteger(assetId);
  if (!parsedAppId || !parsedAssetId) throw createHttpError(400, 'Invalid app or asset id');
  await assertOwnership(parsedAppId, userId);

  const asset = await prisma.appAsset.findFirst({
    where: { id: parsedAssetId, appId: parsedAppId },
  });
  if (!asset) throw createHttpError(404, 'Asset not found');

  await deleteStoredObject({
    storageProvider: asset.storageProvider,
    storageBucket: asset.storageBucket,
    storageKey: asset.storageKey,
  });

  await prisma.appAsset.delete({
    where: { id: asset.id },
  });

  return { success: true };
};

module.exports = {
  createAppAsset,
  listAppAssets,
  getAppAssetDownloadInfo,
  deleteAppAsset,
};
