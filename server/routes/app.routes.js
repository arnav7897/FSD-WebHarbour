const express = require('express');
const auth = require('../middleware/auth.middleware');
const optionalAuth = require('../middleware/optionalAuth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createAppHandler,
  listAppsHandler,
  getAppByIdHandler,
  updateAppHandler,
  uploadAppMediaHandler,
  publishAppHandler,
  submitAppHandler,
  createAppVersionHandler,
  listAppVersionsHandler,
  uploadAppVersionHandler,
  uploadAppAssetHandler,
  listAppAssetsHandler,
  downloadAppAssetHandler,
  deleteAppAssetHandler,
  downloadAppHandler,
  downloadAppRedirectHandler,
  addFavoriteHandler,
  removeFavoriteHandler,
} = require('../controllers/app.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  VERSION_UPLOAD_MAX_BYTES,
  ASSET_UPLOAD_MAX_BYTES,
} = require('../config/env');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'tmp', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });
const versionUpload = multer({ dest: uploadDir, limits: { fileSize: VERSION_UPLOAD_MAX_BYTES } });
const assetUpload = multer({ dest: uploadDir, limits: { fileSize: ASSET_UPLOAD_MAX_BYTES } });

/**
 * @openapi
 * /apps:
 *   post:
 *     tags: [Apps]
 *     summary: Create a new app listing
 *     description: Creates an app in DRAFT status. A category is the primary classification and tags are secondary discovery labels.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, categoryId]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Public app title shown in listings and detail pages.
 *                 example: Notion Theme Pack
 *               description:
 *                 type: string
 *                 description: Detailed description of what the app does and who should use it.
 *                 example: Custom themes and layout presets for productivity dashboards.
 *               categoryId:
 *                 type: integer
 *                 description: Primary app category ID (one app belongs to one category).
 *                 example: 2
 *               tags:
 *                 type: array
 *                 description: Optional secondary labels used for search/filtering.
 *                 items:
 *                   type: integer
 *                   example: 3
 *           example:
 *             name: Notion Theme Pack
 *             description: Custom themes and layout presets for productivity dashboards.
 *             categoryId: 2
 *             tags: [3, 5]
 *     responses:
 *       201:
 *         description: App created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', auth, requireRole('DEVELOPER'), createAppHandler);

/**
 * @openapi
 * /apps:
 *   get:
 *     tags: [Apps]
 *     summary: List apps
 *     description: Returns paginated apps. By default only PUBLISHED apps are returned unless status is provided.
 *     parameters:
 *       - in: query
 *         name: q
 *         description: Search keyword matched against app name and description.
 *         schema:
 *           type: string
 *           example: theme
 *       - in: query
 *         name: categoryId
 *         description: Filter by primary category ID.
 *         schema:
 *           type: integer
 *           example: 2
 *       - in: query
 *         name: tagId
 *         description: Filter by a secondary tag ID.
 *         schema:
 *           type: integer
 *           example: 3
 *       - in: query
 *         name: status
 *         description: Filter by app lifecycle status.
 *         schema:
 *           type: string
 *           example: PUBLISHED
 *       - in: query
 *         name: page
 *         description: Page number for pagination.
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         description: Items per page (max 50).
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Paginated list of apps
 */
router.get('/', optionalAuth, listAppsHandler);

/**
 * @openapi
 * /apps/{id}:
 *   get:
 *     tags: [Apps]
 *     summary: Get app details by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: App details
 *       404:
 *         description: App not found
 */
router.get('/:id', getAppByIdHandler);

/**
 * @openapi
 * /apps/{id}:
 *   patch:
 *     tags: [Apps]
 *     summary: Update an owned app
 *     description: Updates app metadata. If tags are provided, existing tags are fully replaced by the new list.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New app title.
 *                 example: Notion Theme Pack Pro
 *               shortDescription:
 *                 type: string
 *                 description: Optional short summary for cards.
 *                 example: Clean templates for focused teams.
 *               description:
 *                 type: string
 *                 description: Updated app description text.
 *               categoryId:
 *                 type: integer
 *                 description: New primary category ID.
 *                 example: 4
 *               iconUrl:
 *                 type: string
 *                 description: URL for the app icon image.
 *               bannerUrl:
 *                 type: string
 *                 description: URL for the app banner image.
 *               screenshots:
 *                 type: array
 *                 description: Full list of screenshot URLs (replaces existing).
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 description: New full list of secondary tag IDs.
 *                 items:
 *                   type: integer
 *                   example: 7
 *           example:
 *             description: Added more templates and improved customization options.
 *             tags: [5, 7, 9]
 *     responses:
 *       200:
 *         description: App updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App not found
 */
router.patch('/:id', auth, requireRole('DEVELOPER'), updateAppHandler);

/**
 * @openapi
 * /apps/{id}/media:
 *   post:
 *     tags: [Apps]
 *     summary: Upload app media (icon, banner, screenshots)
 *     description: Uploads images to Cloudinary and updates the app media fields.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: mode
 *         required: false
 *         schema:
 *           type: string
 *           enum: [append, replace]
 *         description: Screenshot mode. append adds to existing screenshots, replace overwrites.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               icon:
 *                 type: string
 *                 format: binary
 *               banner:
 *                 type: string
 *                 format: binary
 *               screenshots:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               mode:
 *                 type: string
 *                 enum: [append, replace]
 *     responses:
 *       200:
 *         description: Media uploaded
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App not found
 */
router.post(
  '/:id/media',
  auth,
  requireRole('DEVELOPER'),
  upload.fields([
    { name: 'icon', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
    { name: 'screenshots', maxCount: 12 },
  ]),
  uploadAppMediaHandler,
);

/**
 * @openapi
 * /apps/{id}/assets/upload:
 *   post:
 *     tags: [Apps]
 *     summary: Upload app documents or other non-image assets
 *     description: Uploads non-image product files such as manuals, PDFs, archives, or attachments to the configured file storage provider.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               assetType:
 *                 type: string
 *                 enum: [DOCUMENT, GUIDE, LICENSE, ARCHIVE, ATTACHMENT, OTHER]
 *               label:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asset uploaded
 */
router.post('/:id/assets/upload', auth, requireRole('DEVELOPER'), assetUpload.single('file'), uploadAppAssetHandler);

/**
 * @openapi
 * /apps/{id}/assets:
 *   get:
 *     tags: [Apps]
 *     summary: List app assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset list
 */
router.get('/:id/assets', listAppAssetsHandler);

/**
 * @openapi
 * /apps/{id}/assets/{assetId}/download:
 *   get:
 *     tags: [Apps]
 *     summary: Download app asset
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       302:
 *         description: Redirect to a signed asset URL
 */
router.get('/:id/assets/:assetId/download', downloadAppAssetHandler);

/**
 * @openapi
 * /apps/{id}/assets/{assetId}:
 *   delete:
 *     tags: [Apps]
 *     summary: Delete an app asset
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset deleted
 */
router.delete('/:id/assets/:assetId', auth, requireRole('DEVELOPER'), deleteAppAssetHandler);

/**
 * @openapi
 * /apps/{id}/submit:
 *   post:
 *     tags: [Apps]
 *     summary: Submit app for moderation
 *     description: Developer submits owned app for review. Valid transition is DRAFT to UNDER_REVIEW.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: App submitted for review
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App not found
 *       409:
 *         description: Invalid status transition
 */
router.post('/:id/submit', auth, requireRole('DEVELOPER'), submitAppHandler);

/**
 * @openapi
 * /apps/{id}/publish:
 *   post:
 *     tags: [Apps]
 *     summary: Deprecated direct publish endpoint
 *     deprecated: true
 *     description: Deprecated in Phase 4. Publishing now requires submit and admin approval flow.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Not used
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App not found
 *       409:
 *         description: Direct publish disabled
 */
router.post('/:id/publish', auth, requireRole('DEVELOPER'), publishAppHandler);

/**
 * @openapi
 * /apps/{id}/download:
 *   post:
 *     tags: [Apps]
 *     summary: Track app download/install
 *     description: Creates a download record and increments cached download counters.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               versionId:
 *                 type: integer
 *                 description: Optional app version ID. Latest version is used when omitted.
 *                 example: 12
 *     responses:
 *       201:
 *         description: Download record created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App or version not found
 */
router.post('/:id/download', auth, requireRole('USER'), downloadAppHandler);

/**
 * @openapi
 * /apps/{id}/download/redirect:
 *   get:
 *     tags: [Apps]
 *     summary: Track download and redirect to the file
 *     description: Creates a download record and redirects to the version download URL.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: versionId
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: token
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional access token for tracking when using a browser redirect.
 *     responses:
 *       302:
 *         description: Redirect to download URL
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App or version not found
 */
router.get('/:id/download/redirect', optionalAuth, downloadAppRedirectHandler);

/**
 * @openapi
 * /apps/{id}/favorite:
 *   post:
 *     tags: [Apps]
 *     summary: Add app to favorites
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Favorite created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App not found
 *       409:
 *         description: App already favorited
 */
router.post('/:id/favorite', auth, requireRole('USER'), addFavoriteHandler);

/**
 * @openapi
 * /apps/{id}/favorite:
 *   delete:
 *     tags: [Apps]
 *     summary: Remove app from favorites
 *     description: Idempotent delete. Returns success even if app was not previously favorited.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Favorite removed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App not found
 */
router.delete('/:id/favorite', auth, requireRole('USER'), removeFavoriteHandler);

/**
 * @openapi
 * /apps/{id}/versions:
 *   post:
 *     tags: [Apps]
 *     summary: Create a new app version
 *     description: Adds a release entry for an app without overwriting old versions.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [version, downloadUrl]
 *             properties:
 *               version:
 *                 type: string
 *                 description: Semantic version label for this release.
 *                 example: 1.0.1
 *               changelog:
 *                 type: string
 *                 description: Optional release notes describing changes.
 *                 example: Fixed dark mode issues and improved performance.
 *               downloadUrl:
 *                 type: string
 *                 description: URL from which this release can be downloaded.
 *                 example: https://cdn.example.com/apps/notion-theme-pack-1.0.1.zip
 *               fileSize:
 *                 type: string
 *                 description: Human readable file size.
 *                 example: 52 MB
 *               supportedOs:
 *                 type: array
 *                 description: Platforms supported by this release.
 *                 items:
 *                   type: string
 *                   example: WEB
 *           example:
 *             version: 1.0.1
 *             changelog: Fixed dark mode issues and improved performance.
 *             downloadUrl: https://cdn.example.com/apps/notion-theme-pack-1.0.1.zip
 *             fileSize: 52 MB
 *             supportedOs: [WEB, WINDOWS, MACOS]
 *     responses:
 *       201:
 *         description: Version created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App not found
 *       409:
 *         description: Duplicate version
 */
router.post('/:id/versions', auth, requireRole('DEVELOPER'), createAppVersionHandler);

/**
 * @openapi
 * /apps/{id}/versions/upload:
 *   post:
 *     tags: [Apps]
 *     summary: Upload ZIP and create a new app version
 *     description: Uploads ZIP to the configured file storage provider and creates an app version with provider-backed download metadata.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [zip, version]
 *             properties:
 *               zip:
 *                 type: string
 *                 format: binary
 *               version:
 *                 type: string
 *               changelog:
 *                 type: string
 *               fileSize:
 *                 type: string
 *               supportedOs:
 *                 type: string
 *                 description: Comma-separated list (e.g., WEB,WINDOWS,ANDROID)
 *     responses:
 *       201:
 *         description: Version created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App not found
 */
router.post('/:id/versions/upload', auth, requireRole('DEVELOPER'), versionUpload.single('zip'), uploadAppVersionHandler);

/**
 * @openapi
 * /apps/{id}/versions:
 *   get:
 *     tags: [Apps]
 *     summary: List app versions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Version list
 *       404:
 *         description: App not found
 */
router.get('/:id/versions', listAppVersionsHandler);

module.exports = router;
