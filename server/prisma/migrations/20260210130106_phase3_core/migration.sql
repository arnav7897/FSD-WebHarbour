/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'REJECTED', 'SUSPENDED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('SOFTWARE', 'PDF', 'EBOOK', 'TEMPLATE', 'PLUGIN', 'EXTENSION', 'ASSET', 'OTHER');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('WINDOWS', 'MACOS', 'LINUX', 'WEB', 'MOBILE_IOS', 'MOBILE_ANDROID', 'CROSS_PLATFORM');

-- CreateEnum
CREATE TYPE "ReleaseType" AS ENUM ('STABLE', 'BETA', 'ALPHA', 'RELEASE_CANDIDATE', 'NIGHTLY', 'DEVELOPMENT');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('FEATURE', 'BUG_FIX', 'SECURITY', 'PERFORMANCE', 'UI_UX', 'REFACTOR', 'DEPRECATION', 'DOCUMENTATION', 'TRANSLATION', 'ACCESSIBILITY', 'COMPATIBILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'TRIVIAL');

-- CreateEnum
CREATE TYPE "DownloadType" AS ENUM ('DIRECT', 'UPDATE', 'ADMIN', 'API', 'MIRROR', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "AnalyticsPeriod" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "ChecksumType" AS ENUM ('MD5', 'SHA1', 'SHA256', 'SHA512');

-- CreateEnum
CREATE TYPE "Compatibility" AS ENUM ('BACKWARD_COMPATIBLE', 'FORWARD_COMPATIBLE', 'BREAKING_CHANGE', 'DATA_MIGRATION_REQUIRED', 'CONFIG_MIGRATION_REQUIRED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MODERATOR';

-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "DeveloperProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyName" TEXT,
    "website" TEXT,
    "githubUrl" TEXT,
    "portfolioUrl" TEXT,
    "description" TEXT,
    "contactEmail" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationRequestedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "totalDownloads" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeveloperProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "iconUrl" TEXT,
    "bannerUrl" TEXT,
    "screenshots" JSONB,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "price" DOUBLE PRECISION DEFAULT 0.00,
    "discountPrice" DOUBLE PRECISION,
    "isOnSale" BOOLEAN NOT NULL DEFAULT false,
    "contentType" "ContentType" NOT NULL DEFAULT 'SOFTWARE',
    "platforms" "Platform"[],
    "fileSize" TEXT,
    "systemRequirements" TEXT,
    "licenseType" TEXT,
    "ageRating" TEXT,
    "status" "AppStatus" NOT NULL DEFAULT 'DRAFT',
    "developerId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppVersion" (
    "id" SERIAL NOT NULL,
    "version" TEXT NOT NULL,
    "versionCode" TEXT,
    "appId" INTEGER NOT NULL,
    "releaseName" TEXT,
    "releaseType" "ReleaseType" NOT NULL DEFAULT 'STABLE',
    "changelog" TEXT,
    "newFeatures" JSONB,
    "improvements" JSONB,
    "bugFixes" JSONB,
    "breakingChanges" JSONB,
    "knownIssues" JSONB,
    "minOsVersion" TEXT,
    "supportedOs" "Platform"[],
    "dependencies" JSONB,
    "compatibility" "Compatibility"[],
    "downloadUrl" TEXT NOT NULL,
    "mirrorUrl" TEXT,
    "fileSize" TEXT NOT NULL,
    "fileSizeBytes" BIGINT,
    "checksum" TEXT,
    "checksumType" "ChecksumType" NOT NULL DEFAULT 'SHA256',
    "isStable" BOOLEAN NOT NULL DEFAULT true,
    "isPrerelease" BOOLEAN NOT NULL DEFAULT false,
    "isBeta" BOOLEAN NOT NULL DEFAULT false,
    "isAlpha" BOOLEAN NOT NULL DEFAULT false,
    "isRollback" BOOLEAN NOT NULL DEFAULT false,
    "rollbackFromId" INTEGER,
    "requiresUpdate" BOOLEAN NOT NULL DEFAULT false,
    "minAppVersion" TEXT,
    "previousVersionId" INTEGER,
    "securityUpdates" JSONB,
    "vulnerabilityFixed" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "updateCount" INTEGER NOT NULL DEFAULT 0,
    "crashReports" INTEGER NOT NULL DEFAULT 0,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedAt" TIMESTAMP(3),
    "moderatorNotes" TEXT,
    "approvedBy" INTEGER,
    "releaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buildDate" TIMESTAMP(3),
    "supportEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionChangeLog" (
    "id" SERIAL NOT NULL,
    "versionId" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "component" TEXT,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "issueTrackerId" TEXT,
    "affectedPlatforms" "Platform"[],
    "breakingChange" BOOLEAN NOT NULL DEFAULT false,
    "requiresMigration" BOOLEAN NOT NULL DEFAULT false,
    "migrationGuide" TEXT,
    "commitHash" TEXT,
    "pullRequestId" TEXT,
    "authorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VersionChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionDownload" (
    "id" SERIAL NOT NULL,
    "versionId" INTEGER NOT NULL,
    "userId" INTEGER,
    "appId" INTEGER NOT NULL,
    "downloadType" "DownloadType" NOT NULL DEFAULT 'DIRECT',
    "fromVersion" TEXT,
    "toVersion" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "countryCode" TEXT,
    "referrer" TEXT,
    "bytesDownloaded" BIGINT NOT NULL DEFAULT 0,
    "downloadSpeed" DOUBLE PRECISION,
    "isResumed" BOOLEAN NOT NULL DEFAULT false,
    "resumeCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VersionDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionAnalytics" (
    "id" SERIAL NOT NULL,
    "versionId" INTEGER NOT NULL,
    "appId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "period" "AnalyticsPeriod" NOT NULL DEFAULT 'DAILY',
    "totalDownloads" INTEGER NOT NULL DEFAULT 0,
    "uniqueDownloads" INTEGER NOT NULL DEFAULT 0,
    "updateDownloads" INTEGER NOT NULL DEFAULT 0,
    "newDownloads" INTEGER NOT NULL DEFAULT 0,
    "downloadsByCountry" JSONB,
    "downloadsByPlatform" JSONB,
    "successfulDownloads" INTEGER NOT NULL DEFAULT 0,
    "failedDownloads" INTEGER NOT NULL DEFAULT 0,
    "avgDownloadTime" DOUBLE PRECISION,
    "retention1Day" DOUBLE PRECISION,
    "retention7Day" DOUBLE PRECISION,
    "retention30Day" DOUBLE PRECISION,
    "crashReports" INTEGER NOT NULL DEFAULT 0,
    "errorReports" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VersionAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "parentId" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppTag" (
    "id" SERIAL NOT NULL,
    "appId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "userId" INTEGER NOT NULL,
    "appId" INTEGER NOT NULL,
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "reportedCount" INTEGER NOT NULL DEFAULT 0,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedAt" TIMESTAMP(3),
    "moderatorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Download" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "appId" INTEGER NOT NULL,
    "versionId" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "downloadMethod" TEXT,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "appId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "reporterId" INTEGER NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderatorId" INTEGER,
    "moderatorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "appId" INTEGER,
    "userId" INTEGER,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "moderatorId" INTEGER NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appId" INTEGER,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "userId" INTEGER NOT NULL,
    "appId" INTEGER,
    "paymentMethod" TEXT,
    "paymentId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperProfile_userId_key" ON "DeveloperProfile"("userId");

-- CreateIndex
CREATE INDEX "DeveloperProfile_userId_idx" ON "DeveloperProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "App_slug_key" ON "App"("slug");

-- CreateIndex
CREATE INDEX "App_developerId_idx" ON "App"("developerId");

-- CreateIndex
CREATE INDEX "App_categoryId_idx" ON "App"("categoryId");

-- CreateIndex
CREATE INDEX "App_status_idx" ON "App"("status");

-- CreateIndex
CREATE INDEX "App_isFree_idx" ON "App"("isFree");

-- CreateIndex
CREATE INDEX "App_contentType_idx" ON "App"("contentType");

-- CreateIndex
CREATE INDEX "App_downloadCount_idx" ON "App"("downloadCount");

-- CreateIndex
CREATE INDEX "App_averageRating_idx" ON "App"("averageRating");

-- CreateIndex
CREATE INDEX "App_publishedAt_idx" ON "App"("publishedAt");

-- CreateIndex
CREATE INDEX "App_createdAt_idx" ON "App"("createdAt");

-- CreateIndex
CREATE INDEX "AppVersion_appId_idx" ON "AppVersion"("appId");

-- CreateIndex
CREATE INDEX "AppVersion_releaseType_idx" ON "AppVersion"("releaseType");

-- CreateIndex
CREATE INDEX "AppVersion_isStable_idx" ON "AppVersion"("isStable");

-- CreateIndex
CREATE INDEX "AppVersion_releaseDate_idx" ON "AppVersion"("releaseDate");

-- CreateIndex
CREATE INDEX "AppVersion_moderationStatus_idx" ON "AppVersion"("moderationStatus");

-- CreateIndex
CREATE INDEX "AppVersion_requiresUpdate_idx" ON "AppVersion"("requiresUpdate");

-- CreateIndex
CREATE UNIQUE INDEX "AppVersion_appId_version_key" ON "AppVersion"("appId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AppVersion_appId_versionCode_key" ON "AppVersion"("appId", "versionCode");

-- CreateIndex
CREATE INDEX "VersionChangeLog_versionId_idx" ON "VersionChangeLog"("versionId");

-- CreateIndex
CREATE INDEX "VersionChangeLog_changeType_idx" ON "VersionChangeLog"("changeType");

-- CreateIndex
CREATE INDEX "VersionChangeLog_priority_idx" ON "VersionChangeLog"("priority");

-- CreateIndex
CREATE INDEX "VersionChangeLog_breakingChange_idx" ON "VersionChangeLog"("breakingChange");

-- CreateIndex
CREATE INDEX "VersionDownload_versionId_idx" ON "VersionDownload"("versionId");

-- CreateIndex
CREATE INDEX "VersionDownload_userId_idx" ON "VersionDownload"("userId");

-- CreateIndex
CREATE INDEX "VersionDownload_appId_idx" ON "VersionDownload"("appId");

-- CreateIndex
CREATE INDEX "VersionDownload_downloadType_idx" ON "VersionDownload"("downloadType");

-- CreateIndex
CREATE INDEX "VersionDownload_startedAt_idx" ON "VersionDownload"("startedAt");

-- CreateIndex
CREATE INDEX "VersionDownload_countryCode_idx" ON "VersionDownload"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "VersionAnalytics_versionId_key" ON "VersionAnalytics"("versionId");

-- CreateIndex
CREATE INDEX "VersionAnalytics_versionId_idx" ON "VersionAnalytics"("versionId");

-- CreateIndex
CREATE INDEX "VersionAnalytics_appId_idx" ON "VersionAnalytics"("appId");

-- CreateIndex
CREATE INDEX "VersionAnalytics_date_idx" ON "VersionAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "VersionAnalytics_versionId_date_period_key" ON "VersionAnalytics"("versionId", "date", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_order_idx" ON "Category"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_slug_idx" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_isFeatured_idx" ON "Tag"("isFeatured");

-- CreateIndex
CREATE INDEX "AppTag_appId_idx" ON "AppTag"("appId");

-- CreateIndex
CREATE INDEX "AppTag_tagId_idx" ON "AppTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "AppTag_appId_tagId_key" ON "AppTag"("appId", "tagId");

-- CreateIndex
CREATE INDEX "Review_appId_idx" ON "Review"("appId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE INDEX "Review_moderationStatus_idx" ON "Review"("moderationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Review_appId_userId_key" ON "Review"("appId", "userId");

-- CreateIndex
CREATE INDEX "Download_userId_idx" ON "Download"("userId");

-- CreateIndex
CREATE INDEX "Download_appId_idx" ON "Download"("appId");

-- CreateIndex
CREATE INDEX "Download_versionId_idx" ON "Download"("versionId");

-- CreateIndex
CREATE INDEX "Download_downloadedAt_idx" ON "Download"("downloadedAt");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_appId_idx" ON "Favorite"("appId");

-- CreateIndex
CREATE INDEX "Favorite_createdAt_idx" ON "Favorite"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_appId_key" ON "Favorite"("userId", "appId");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_type_targetId_idx" ON "Report"("type", "targetId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "ModerationLog_entityType_entityId_idx" ON "ModerationLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ModerationLog_moderatorId_idx" ON "ModerationLog"("moderatorId");

-- CreateIndex
CREATE INDEX "ModerationLog_createdAt_idx" ON "ModerationLog"("createdAt");

-- CreateIndex
CREATE INDEX "ModerationLog_action_idx" ON "ModerationLog"("action");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_appId_idx" ON "Transaction"("appId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- AddForeignKey
ALTER TABLE "DeveloperProfile" ADD CONSTRAINT "DeveloperProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "DeveloperProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppVersion" ADD CONSTRAINT "AppVersion_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppVersion" ADD CONSTRAINT "AppVersion_rollbackFromId_fkey" FOREIGN KEY ("rollbackFromId") REFERENCES "AppVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppVersion" ADD CONSTRAINT "AppVersion_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "AppVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppVersion" ADD CONSTRAINT "AppVersion_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionChangeLog" ADD CONSTRAINT "VersionChangeLog_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AppVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionChangeLog" ADD CONSTRAINT "VersionChangeLog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionDownload" ADD CONSTRAINT "VersionDownload_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AppVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionDownload" ADD CONSTRAINT "VersionDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionDownload" ADD CONSTRAINT "VersionDownload_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionAnalytics" ADD CONSTRAINT "VersionAnalytics_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AppVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionAnalytics" ADD CONSTRAINT "VersionAnalytics_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppTag" ADD CONSTRAINT "AppTag_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppTag" ADD CONSTRAINT "AppTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Download" ADD CONSTRAINT "Download_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Download" ADD CONSTRAINT "Download_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Download" ADD CONSTRAINT "Download_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AppVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;
