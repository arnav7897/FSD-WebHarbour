-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('S3', 'LOCAL', 'CLOUDINARY', 'GRIDFS');

-- CreateEnum
CREATE TYPE "AppAssetType" AS ENUM ('DOCUMENT', 'GUIDE', 'LICENSE', 'ARCHIVE', 'ATTACHMENT', 'OTHER');

-- AlterTable
ALTER TABLE "AppVersion"
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "storageBucket" TEXT,
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "storageObjectUrl" TEXT,
ADD COLUMN "storageProvider" "StorageProvider";

-- CreateTable
CREATE TABLE "AppAsset" (
  "id" SERIAL NOT NULL,
  "appId" INTEGER NOT NULL,
  "uploadedById" INTEGER NOT NULL,
  "storageProvider" "StorageProvider" NOT NULL,
  "storageBucket" TEXT,
  "storageKey" TEXT,
  "storageObjectUrl" TEXT,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileExtension" TEXT,
  "byteSize" BIGINT NOT NULL DEFAULT 0,
  "assetType" "AppAssetType" NOT NULL DEFAULT 'OTHER',
  "label" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AppAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppAsset_appId_idx" ON "AppAsset"("appId");

-- CreateIndex
CREATE INDEX "AppAsset_uploadedById_idx" ON "AppAsset"("uploadedById");

-- CreateIndex
CREATE INDEX "AppAsset_assetType_idx" ON "AppAsset"("assetType");

-- CreateIndex
CREATE INDEX "AppAsset_createdAt_idx" ON "AppAsset"("createdAt");

-- AddForeignKey
ALTER TABLE "AppAsset" ADD CONSTRAINT "AppAsset_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppAsset" ADD CONSTRAINT "AppAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
