const express = require('express');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { listMyFavoritesHandler } = require('../controllers/user.controller');

const router = express.Router();

/**
 * @openapi
 * /users/me/favorites:
 *   get:
 *     tags: [Users]
 *     summary: List current user's favorited apps
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Favorite apps list
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.get('/me/favorites', auth, requireRole('USER'), listMyFavoritesHandler);

module.exports = router;
