const path = require('path');
const {
  FILE_STORAGE_PROVIDER,
  FILE_STORAGE_PREFIX_RELEASES,
  FILE_STORAGE_PREFIX_ASSETS,
} = require('../../config/env');
const { createHttpError } = require('../../middleware/error.middleware');
const localProvider = require('./local-storage.provider');
const s3Provider = require('./s3-storage.provider');

const NON_IMAGE_ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.txt', '.md', '.csv', '.json',
  '.zip', '.rar', '.7z', '.tar', '.gz',
]);

const providerRegistry = {
  local: localProvider,
  s3: s3Provider,
};

const storageProviderName = () => {
  const value = String(FILE_STORAGE_PROVIDER || 'local').toLowerCase();
  return providerRegistry[value] ? value : 'local';
};

const getProvider = () => providerRegistry[storageProviderName()];

const inferExtension = (filename = '') => path.extname(String(filename || '')).toLowerCase();

const assertNonImageFileAllowed = (file) => {
  const mimetype = String(file?.mimetype || '').toLowerCase();
  const extension = inferExtension(file?.originalname || file?.filename || '');
  if (mimetype.startsWith('image/')) {
    throw createHttpError(400, 'Image files must use the app media upload API.');
  }
  if (extension && NON_IMAGE_ALLOWED_EXTENSIONS.has(extension)) return;
  if (!extension && mimetype === 'application/octet-stream') return;
  if (mimetype === 'application/octet-stream') return;
  throw createHttpError(400, `Unsupported file type: ${extension || mimetype || 'unknown'}`);
};

const assertZipFile = (file) => {
  const extension = inferExtension(file?.originalname || file?.filename || '');
  if (extension !== '.zip') {
    throw createHttpError(400, 'Only .zip files are allowed for version uploads.');
  }
};

const normalizeStorageProvider = (provider) => String(provider || 'LOCAL').toUpperCase();

const storeFile = async ({ tempPath, filename, mimeType, category, appId }) => {
  const provider = getProvider();
  const result = await provider.putObject({
    tempPath,
    filename,
    mimeType,
    category,
    appId,
  });
  return {
    storageProvider: normalizeStorageProvider(result.provider),
    storageBucket: result.bucket || null,
    storageKey: result.key || null,
    storageObjectUrl: result.url || null,
    mimeType: result.mimeType || mimeType || 'application/octet-stream',
    byteSize: result.byteSize || 0,
  };
};

const storeVersionArchive = async ({ file, appId }) => {
  assertZipFile(file);
  return storeFile({
    tempPath: file.path,
    filename: file.originalname || file.filename,
    mimeType: file.mimetype || 'application/zip',
    category: FILE_STORAGE_PREFIX_RELEASES,
    appId,
  });
};

const storeAppAssetFile = async ({ file, appId }) => {
  assertNonImageFileAllowed(file);
  return storeFile({
    tempPath: file.path,
    filename: file.originalname || file.filename,
    mimeType: file.mimetype || 'application/octet-stream',
    category: FILE_STORAGE_PREFIX_ASSETS,
    appId,
  });
};

const buildDownloadTarget = async ({ storageProvider, storageBucket, storageKey, storageObjectUrl, filename, mimeType }) => {
  if (!storageKey && storageObjectUrl) return storageObjectUrl;
  const providerName = String(storageProvider || storageProviderName()).toLowerCase();
  const provider = providerRegistry[providerName];
  if (!provider) {
    throw createHttpError(500, `Unsupported storage provider: ${storageProvider}`);
  }
  return provider.getSignedReadUrl({
    bucket: storageBucket,
    key: storageKey,
    filename,
    mimeType,
  });
};

const deleteStoredObject = async ({ storageProvider, storageBucket, storageKey }) => {
  if (!storageKey) return;
  const providerName = String(storageProvider || storageProviderName()).toLowerCase();
  const provider = providerRegistry[providerName];
  if (!provider) return;
  await provider.deleteObject({
    bucket: storageBucket,
    key: storageKey,
  });
};

const healthcheck = async () => {
  const provider = getProvider();
  return provider.healthcheck();
};

module.exports = {
  storeVersionArchive,
  storeAppAssetFile,
  buildDownloadTarget,
  deleteStoredObject,
  healthcheck,
  assertZipFile,
  assertNonImageFileAllowed,
};
