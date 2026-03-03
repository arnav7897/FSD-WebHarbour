const dotenv = require('dotenv');
const { DEFAULT_PORT } = require('./constants');

dotenv.config();

const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const EMAIL_VERIFICATION_TOKEN_EXPIRES_IN = process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN || '1d';
const PASSWORD_RESET_TOKEN_EXPIRES_IN = process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '15m';
const AUTH_REQUIRE_EMAIL_VERIFIED = (process.env.AUTH_REQUIRE_EMAIL_VERIFIED || 'true').toLowerCase() === 'true';
const AUTH_EXPOSE_DEBUG_TOKENS = (process.env.AUTH_EXPOSE_DEBUG_TOKENS || (NODE_ENV !== 'production' ? 'true' : 'false')).toLowerCase() === 'true';
const DATABASE_URL = process.env.DATABASE_URL || process.env.DB_URI;

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
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN,
  PASSWORD_RESET_TOKEN_EXPIRES_IN,
  AUTH_REQUIRE_EMAIL_VERIFIED,
  AUTH_EXPOSE_DEBUG_TOKENS,
  DATABASE_URL,
};
