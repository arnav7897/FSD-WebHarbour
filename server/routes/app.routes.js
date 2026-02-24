const express = require('express');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createAppHandler,
  listAppsHandler,
  getAppByIdHandler,
  updateAppHandler,
  publishAppHandler,
  createAppVersionHandler,
  listAppVersionsHandler,
} = require('../controllers/app.controller');

const router = express.Router();

/**
 * @openapi
 * /apps:
 *   post:
 *     tags: [Apps]
 *     summary: Create a new app listing
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
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: integer
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
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tagId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of apps
 */
router.get('/', listAppsHandler);

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
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: App updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App not found
 */
router.patch('/:id', auth, requireRole('DEVELOPER'), updateAppHandler);

/**
 * @openapi
 * /apps/{id}/publish:
 *   post:
 *     tags: [Apps]
 *     summary: Publish an owned app
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
 *         description: App published
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App not found
 *       409:
 *         description: Already published
 */
router.post('/:id/publish', auth, requireRole('DEVELOPER'), publishAppHandler);

/**
 * @openapi
 * /apps/{id}/versions:
 *   post:
 *     tags: [Apps]
 *     summary: Create a new app version
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
 *               changelog:
 *                 type: string
 *               downloadUrl:
 *                 type: string
 *               fileSize:
 *                 type: string
 *               supportedOs:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Version created
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
