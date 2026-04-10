const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  FILE_STORAGE_REGION,
  FILE_STORAGE_BUCKET,
  FILE_STORAGE_ENDPOINT,
  FILE_STORAGE_ACCESS_KEY_ID,
  FILE_STORAGE_SECRET_ACCESS_KEY,
  FILE_STORAGE_FORCE_PATH_STYLE,
  FILE_STORAGE_SIGNED_URL_TTL_SECONDS,
  FILE_STORAGE_PUBLIC_BASE_URL,
} = require('../../config/env');

let cachedClient = null;
let cachedSdk = null;

const loadSdk = () => {
  if (cachedSdk) return cachedSdk;
  try {
    const s3 = require('@aws-sdk/client-s3');
    const presigner = require('@aws-sdk/s3-request-presigner');
    cachedSdk = { ...s3, ...presigner };
    return cachedSdk;
  } catch (err) {
    throw new Error('S3 storage requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner to be installed.');
  }
};

const getClient = () => {
  if (cachedClient) return cachedClient;
  const { S3Client } = loadSdk();
  if (!FILE_STORAGE_BUCKET || !FILE_STORAGE_ACCESS_KEY_ID || !FILE_STORAGE_SECRET_ACCESS_KEY) {
    throw new Error('S3 storage is not configured. Set FILE_STORAGE_BUCKET, FILE_STORAGE_ACCESS_KEY_ID, and FILE_STORAGE_SECRET_ACCESS_KEY.');
  }
  cachedClient = new S3Client({
    region: FILE_STORAGE_REGION,
    endpoint: FILE_STORAGE_ENDPOINT || undefined,
    forcePathStyle: FILE_STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: FILE_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: FILE_STORAGE_SECRET_ACCESS_KEY,
    },
  });
  return cachedClient;
};

const sanitizeSegment = (value, fallback = 'file') =>
  String(value || fallback)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;

const buildKey = ({ category, filename, appId }) => {
  const ext = path.extname(filename || '');
  const base = path.basename(filename || `asset${ext}`, ext);
  const safeCategory = sanitizeSegment(category, 'files');
  const safeBase = sanitizeSegment(base, 'asset');
  const stamp = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  return `${safeCategory}/app-${sanitizeSegment(appId, '0')}/${stamp}-${safeBase}${ext}`;
};

const buildPublicUrl = (key) => {
  const base = String(FILE_STORAGE_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (!base) return null;
  return `${base}/${String(key).replace(/^\/+/, '')}`;
};

const putObject = async ({ tempPath, filename, category, appId, mimeType }) => {
  const { PutObjectCommand } = loadSdk();
  const client = getClient();
  const key = buildKey({ category, filename, appId });
  const body = fs.createReadStream(tempPath);
  const contentType = mimeType || 'application/octet-stream';

  await client.send(new PutObjectCommand({
    Bucket: FILE_STORAGE_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: {
      originalname: path.basename(filename || key),
      category: String(category || 'files'),
      appid: String(appId || ''),
    },
  }));

  const stats = fs.statSync(tempPath);

  return {
    provider: 'S3',
    bucket: FILE_STORAGE_BUCKET,
    key,
    url: buildPublicUrl(key),
    byteSize: stats.size,
    mimeType: contentType,
  };
};

const getSignedReadUrl = async ({ bucket, key, filename, mimeType }) => {
  const { GetObjectCommand, getSignedUrl } = loadSdk();
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: bucket || FILE_STORAGE_BUCKET,
    Key: key,
    ResponseContentType: mimeType || 'application/octet-stream',
    ResponseContentDisposition: `attachment; filename="${String(filename || path.basename(key || 'download')).replace(/"/g, '')}"`,
  });
  return getSignedUrl(client, command, { expiresIn: FILE_STORAGE_SIGNED_URL_TTL_SECONDS });
};

const deleteObject = async ({ bucket, key }) => {
  if (!key) return;
  const { DeleteObjectCommand } = loadSdk();
  const client = getClient();
  await client.send(new DeleteObjectCommand({
    Bucket: bucket || FILE_STORAGE_BUCKET,
    Key: key,
  }));
};

const healthcheck = async () => {
  const { HeadBucketCommand } = loadSdk();
  const client = getClient();
  await client.send(new HeadBucketCommand({ Bucket: FILE_STORAGE_BUCKET }));
  return { ok: true, provider: 'S3', bucket: FILE_STORAGE_BUCKET };
};

module.exports = {
  putObject,
  getSignedReadUrl,
  deleteObject,
  healthcheck,
};
