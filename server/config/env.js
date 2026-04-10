const dotenv = require('dotenv');
const path = require('path');
const { DEFAULT_PORT } = require('./constants');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const PASSWORD_RESET_TOKEN_EXPIRES_IN = process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '15m';
const AUTH_EXPOSE_DEBUG_TOKENS = (process.env.AUTH_EXPOSE_DEBUG_TOKENS || (NODE_ENV !== 'production' ? 'true' : 'false')).toLowerCase() === 'true';
const DATABASE_URL = process.env.DATABASE_URL || process.env.DB_URI;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FILE_STORAGE_PROVIDER = (process.env.FILE_STORAGE_PROVIDER || 'local').toLowerCase();
const FILE_STORAGE_REGION = process.env.FILE_STORAGE_REGION || 'auto';
const FILE_STORAGE_BUCKET = process.env.FILE_STORAGE_BUCKET || '';
const FILE_STORAGE_ENDPOINT = process.env.FILE_STORAGE_ENDPOINT || '';
const FILE_STORAGE_ACCESS_KEY_ID = process.env.FILE_STORAGE_ACCESS_KEY_ID || '';
const FILE_STORAGE_SECRET_ACCESS_KEY = process.env.FILE_STORAGE_SECRET_ACCESS_KEY || '';
const FILE_STORAGE_FORCE_PATH_STYLE = String(process.env.FILE_STORAGE_FORCE_PATH_STYLE || 'false').toLowerCase() === 'true';
const FILE_STORAGE_PUBLIC_BASE_URL = process.env.FILE_STORAGE_PUBLIC_BASE_URL || '';
const FILE_STORAGE_SIGNED_URL_TTL_SECONDS = Math.max(Number(process.env.FILE_STORAGE_SIGNED_URL_TTL_SECONDS) || 3600, 60);
const FILE_STORAGE_PREFIX_RELEASES = process.env.FILE_STORAGE_PREFIX_RELEASES || 'app-releases';
const FILE_STORAGE_PREFIX_ASSETS = process.env.FILE_STORAGE_PREFIX_ASSETS || 'app-assets';
const VERSION_UPLOAD_MAX_BYTES = Math.max(Number(process.env.VERSION_UPLOAD_MAX_BYTES) || 524288000, 1);
const ASSET_UPLOAD_MAX_BYTES = Math.max(Number(process.env.ASSET_UPLOAD_MAX_BYTES) || 104857600, 1);

if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Auth will not work correctly.');
}
if (!DATABASE_URL) {
  console.warn('DATABASE_URL is not set. Prisma will not connect.');
}

module.exports = {
  PORT,
  NODE_ENV,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  PASSWORD_RESET_TOKEN_EXPIRES_IN,
  AUTH_EXPOSE_DEBUG_TOKENS,
  DATABASE_URL,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  FILE_STORAGE_PROVIDER,
  FILE_STORAGE_REGION,
  FILE_STORAGE_BUCKET,
  FILE_STORAGE_ENDPOINT,
  FILE_STORAGE_ACCESS_KEY_ID,
  FILE_STORAGE_SECRET_ACCESS_KEY,
  FILE_STORAGE_FORCE_PATH_STYLE,
  FILE_STORAGE_PUBLIC_BASE_URL,
  FILE_STORAGE_SIGNED_URL_TTL_SECONDS,
  FILE_STORAGE_PREFIX_RELEASES,
  FILE_STORAGE_PREFIX_ASSETS,
  VERSION_UPLOAD_MAX_BYTES,
  ASSET_UPLOAD_MAX_BYTES,
};
