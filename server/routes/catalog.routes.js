const express = require('express');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  listCategoriesHandler,
  createCategoryHandler,
  listTagsHandler,
  createTagHandler,
} = require('../controllers/catalog.controller');

const router = express.Router();

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Apps]
 *     summary: List active categories
 *     description: Public endpoint to fetch category options used as primary app classification.
 *     responses:
 *       200:
 *         description: Category list
 */
router.get('/categories', listCategoriesHandler);

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Admin]
 *     summary: Create category
 *     description: Admin-only endpoint to create a primary app classification.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Productivity
 *               slug:
 *                 type: string
 *                 example: productivity
 *               description:
 *                 type: string
 *               iconUrl:
 *                 type: string
 *               parentId:
 *                 type: integer
 *                 nullable: true
 *               order:
 *                 type: integer
 *                 example: 1
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Parent category not found
 *       409:
 *         description: Name or slug conflict
 */
router.post('/categories', auth, requireRole('ADMIN'), createCategoryHandler);

/**
 * @openapi
 * /tags:
 *   get:
 *     tags: [Apps]
 *     summary: List tags
 *     description: Public endpoint to fetch secondary labels used for app discovery and filters.
 *     responses:
 *       200:
 *         description: Tag list
 */
router.get('/tags', listTagsHandler);

/**
 * @openapi
 * /tags:
 *   post:
 *     tags: [Admin]
 *     summary: Create tag
 *     description: Admin-only endpoint to create a reusable secondary classification label.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Open Source
 *               slug:
 *                 type: string
 *                 example: open-source
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *                 example: '#0ea5e9'
 *               isFeatured:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Tag created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Name or slug conflict
 */
router.post('/tags', auth, requireRole('ADMIN'), createTagHandler);

module.exports = router;
