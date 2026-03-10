const express = require('express');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  approveAppHandler,
  rejectAppHandler,
  suspendAppHandler,
  unsuspendAppHandler,
  listDeveloperRequestsHandler,
  approveDeveloperRequestHandler,
  rejectDeveloperRequestHandler,
} = require('../controllers/admin.controller');
const { listReportsHandler, resolveReportHandler } = require('../controllers/report.controller');

const router = express.Router();

/**
 * @openapi
 * /admin/apps/{id}/approve:
 *   patch:
 *     tags: [Admin]
 *     summary: Approve app after review
 *     description: Moves app from UNDER_REVIEW to PUBLISHED.
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
 *         description: App approved
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
router.patch('/apps/:id/approve', auth, requireRole('ADMIN'), approveAppHandler);

/**
 * @openapi
 * /admin/apps/{id}/reject:
 *   patch:
 *     tags: [Admin]
 *     summary: Reject app in review
 *     description: Moves app from UNDER_REVIEW to REJECTED. A moderation note is required.
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
 *             required: [moderationNote]
 *             properties:
 *               moderationNote:
 *                 type: string
 *                 example: Please add clearer screenshots and fix the broken download link.
 *               note:
 *                 type: string
 *                 description: Alias for moderationNote.
 *     responses:
 *       200:
 *         description: App rejected
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
router.patch('/apps/:id/reject', auth, requireRole('ADMIN'), rejectAppHandler);

/**
 * @openapi
 * /admin/apps/{id}/suspend:
 *   patch:
 *     tags: [Admin]
 *     summary: Suspend published app
 *     description: Moves app from PUBLISHED to SUSPENDED. A suspension reason is required.
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
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Malware signature detected in latest binary.
 *     responses:
 *       200:
 *         description: App suspended
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
router.patch('/apps/:id/suspend', auth, requireRole('ADMIN'), suspendAppHandler);

/**
 * @openapi
 * /admin/apps/{id}/unsuspend:
 *   patch:
 *     tags: [Admin]
 *     summary: Restore suspended app
 *     description: Moves app from SUSPENDED back to PUBLISHED.
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
 *               note:
 *                 type: string
 *                 example: Issue resolved and verified by moderation team.
 *     responses:
 *       200:
 *         description: App unsuspended
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
router.patch('/apps/:id/unsuspend', auth, requireRole('ADMIN'), unsuspendAppHandler);

/**
 * @openapi
 * /admin/developers/requests:
 *   get:
 *     tags: [Admin]
 *     summary: List developer access requests
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED]
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
 *         description: Developer requests list
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/developers/requests', auth, requireRole('ADMIN'), listDeveloperRequestsHandler);

/**
 * @openapi
 * /admin/developers/{userId}/approve:
 *   patch:
 *     tags: [Admin]
 *     summary: Approve developer access request
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Developer approved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.patch('/developers/:userId/approve', auth, requireRole('ADMIN'), approveDeveloperRequestHandler);

/**
 * @openapi
 * /admin/developers/{userId}/reject:
 *   patch:
 *     tags: [Admin]
 *     summary: Reject developer access request
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Developer request rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.patch('/developers/:userId/reject', auth, requireRole('ADMIN'), rejectDeveloperRequestHandler);

/**
 * @openapi
 * /admin/reports:
 *   get:
 *     tags: [Admin]
 *     summary: List reports for moderation
 *     description: Filter by report status, type, and created date range.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, FLAGGED]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [APP, REVIEW, USER]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *     responses:
 *       200:
 *         description: Paginated reports list
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/reports', auth, requireRole('ADMIN'), listReportsHandler);

/**
 * @openapi
 * /admin/reports/{id}/resolve:
 *   patch:
 *     tags: [Admin]
 *     summary: Resolve report
 *     description: Resolve a pending report with moderator decision and optional notes.
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
 *             required: [decision]
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, FLAGGED]
 *                 example: APPROVED
 *               notes:
 *                 type: string
 *                 example: Confirmed violation and action taken on target entity.
 *     responses:
 *       200:
 *         description: Report resolved
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Report not found
 *       409:
 *         description: Report already resolved
 */
router.patch('/reports/:id/resolve', auth, requireRole('ADMIN'), resolveReportHandler);

module.exports = router;
