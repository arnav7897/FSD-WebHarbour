const express = require('express');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { createReportHandler } = require('../controllers/report.controller');

const router = express.Router();

/**
 * @openapi
 * /reports:
 *   post:
 *     tags: [Reports]
 *     summary: Submit trust and safety report
 *     description: Report an app, review, or user for moderation.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, targetId, reason]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [APP, REVIEW, USER]
 *                 example: APP
 *               targetId:
 *                 type: integer
 *                 example: 12
 *               reason:
 *                 type: string
 *                 example: Contains malware-like behavior.
 *               description:
 *                 type: string
 *                 example: App requests suspicious permissions and downloads unknown binaries.
 *     responses:
 *       201:
 *         description: Report created
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
router.post('/', auth, requireRole('USER'), createReportHandler);

module.exports = router;
