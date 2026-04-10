const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { FILE_STORAGE_PUBLIC_BASE_URL } = require('../../config/env');

const rootDir = path.join(__dirname, '..', '..', 'tmp', 'uploads', 'files');

const ensureDir = (target) => {
  fs.mkdirSync(target, { recursive: true });
};

const sanitizeSegment = (value, fallback = 'file') =>
  String(value || fallback)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;

const buildRelativePath = ({ category, filename, appId }) => {
  const ext = path.extname(filename || '');
  const base = path.basename(filename || `asset${ext}`, ext);
  const safeCategory = sanitizeSegment(category, 'files');
  const safeBase = sanitizeSegment(base, 'asset');
  const stamp = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  return path.join(safeCategory, `app-${sanitizeSegment(appId, '0')}`, `${stamp}-${safeBase}${ext}`);
};

const buildPublicUrl = (relativePath) => {
  const normalized = `/uploads/files/${String(relativePath).replace(/\\/g, '/')}`;
  const base = String(FILE_STORAGE_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  return base ? `${base}${normalized}` : normalized;
};

const putObject = async ({ tempPath, filename, category, appId, mimeType }) => {
  const relativePath = buildRelativePath({ category, filename, appId });
  const absolutePath = path.join(rootDir, relativePath);
  ensureDir(path.dirname(absolutePath));
  fs.copyFileSync(tempPath, absolutePath);
  const stats = fs.statSync(absolutePath);

  return {
    provider: 'LOCAL',
    bucket: null,
    key: relativePath.replace(/\\/g, '/'),
    url: buildPublicUrl(relativePath),
    byteSize: stats.size,
    mimeType: mimeType || 'application/octet-stream',
  };
};

const getSignedReadUrl = async ({ key }) => {
  if (!key) throw new Error('Local storage key is required');
  return buildPublicUrl(key);
};

const deleteObject = async ({ key }) => {
  if (!key) return;
  const absolutePath = path.join(rootDir, String(key));
  fs.rmSync(absolutePath, { force: true });
};

const healthcheck = async () => {
  ensureDir(rootDir);
  return { ok: true, provider: 'LOCAL' };
};

module.exports = {
  putObject,
  getSignedReadUrl,
  deleteObject,
  healthcheck,
};
