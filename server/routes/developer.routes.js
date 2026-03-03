const express = require('express');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  developerOverviewHandler,
  developerAppAnalyticsHandler,
} = require('../controllers/developer.controller');

const router = express.Router();

/**
 * @openapi
 * /developer/analytics/overview:
 *   get:
 *     tags: [Developer]
 *     summary: Get developer analytics overview
 *     description: Returns aggregate totals and averages across all apps owned by current developer.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Developer analytics overview
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.get('/analytics/overview', auth, requireRole('DEVELOPER'), developerOverviewHandler);

/**
 * @openapi
 * /developer/analytics/apps/{id}:
 *   get:
 *     tags: [Developer]
 *     summary: Get per-app analytics trends
 *     description: Returns app totals, review metrics, and version-wise adoption/download trends.
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
 *         description: Per-app analytics
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.get('/analytics/apps/:id', auth, requireRole('DEVELOPER'), developerAppAnalyticsHandler);

module.exports = router;
