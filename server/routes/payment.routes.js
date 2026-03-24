const express = require('express');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
    checkoutAppHandler,
    connectDeveloperHandler,
} = require('../controllers/payment.controller');

const router = express.Router();

/**
 * @openapi
 * /payments/checkout/{id}:
 *   post:
 *     tags: [Payments]
 *     summary: Create a checkout session for purchasing an app
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
 *         description: Checkout session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean' }
 *                 url: { type: 'string', description: 'Stripe Checkout URL' }
 */
router.post('/checkout/:id', auth, requireRole('USER'), checkoutAppHandler);

/**
 * @openapi
 * /payments/developer/connect:
 *   post:
 *     tags: [Payments]
 *     summary: Create a Stripe Connect Account linking URL
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Stripe Connect Account Linking URL created
 */
router.post('/developer/connect', auth, requireRole('DEVELOPER'), connectDeveloperHandler);

module.exports = router;
