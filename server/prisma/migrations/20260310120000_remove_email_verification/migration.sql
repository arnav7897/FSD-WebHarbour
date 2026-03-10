-- Remove email verification fields and table
ALTER TABLE "User" DROP COLUMN IF EXISTS "isVerified", DROP COLUMN IF EXISTS "emailVerifiedAt";

DROP TABLE IF EXISTS "EmailVerificationToken" CASCADE;
