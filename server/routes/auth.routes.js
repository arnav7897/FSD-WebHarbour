const express = require('express');
const { register, login, becomeDeveloper, refresh, me } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered
 */
router.post('/register', register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', login);

/**
 * @openapi
 * /auth/become-developer:
 *   post:
 *     tags: [Auth]
 *     summary: Upgrade current user role to DEVELOPER
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Role updated and new tokens issued
 *       401:
 *         description: Missing or invalid token
 *       404:
 *         description: User not found
 */
router.post('/become-developer', auth, becomeDeveloper);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', refresh);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *       401:
 *         description: Missing or invalid token
 */
router.get('/me', auth, me);

module.exports = router;
