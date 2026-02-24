const express = require('express');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createReviewHandler,
  listReviewsHandler,
  updateReviewHandler,
  deleteReviewHandler,
} = require('../controllers/review.controller');

const router = express.Router();

/**
 * @openapi
 * /apps/{appId}/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Create review
 *     description: Creates one review per user per app. Duplicate review attempts return conflict.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               title:
 *                 type: string
 *                 example: Great app
 *               comment:
 *                 type: string
 *                 example: Very useful and stable.
 *     responses:
 *       201:
 *         description: Review created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: App not found
 *       409:
 *         description: User already reviewed this app
 */
router.post('/:appId/reviews', auth, requireRole('USER'), createReviewHandler);

/**
 * @openapi
 * /apps/{appId}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: List app reviews
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reviews list
 *       400:
 *         description: Validation error
 *       404:
 *         description: App not found
 */
router.get('/:appId/reviews', listReviewsHandler);

/**
 * @openapi
 * /apps/{appId}/reviews/{reviewId}:
 *   patch:
 *     tags: [Reviews]
 *     summary: Update own review
 *     description: Only review owner can update review. Rating must stay in range 1 to 5.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: reviewId
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
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review or app not found
 */
router.patch('/:appId/reviews/:reviewId', auth, requireRole('USER'), updateReviewHandler);

/**
 * @openapi
 * /apps/{appId}/reviews/{reviewId}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete review
 *     description: Review owner can delete their own review. Admin can delete any review.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Review deleted
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review or app not found
 */
router.delete('/:appId/reviews/:reviewId', auth, requireRole('USER'), deleteReviewHandler);

module.exports = router;
