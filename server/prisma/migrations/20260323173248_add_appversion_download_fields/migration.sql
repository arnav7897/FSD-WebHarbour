-- AlterTable
ALTER TABLE "AppVersion" ADD COLUMN     "downloadFilename" TEXT,
ADD COLUMN     "downloadFormat" TEXT,
ADD COLUMN     "downloadPublicId" TEXT;
