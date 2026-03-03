const express = require('express');
const {
  register,
  login,
  becomeDeveloper,
  refresh,
  me,
  logout,
  logoutAll,
  requestEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates user account and issues an email verification token.
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
 *           example:
 *             name: Alice Doe
 *             email: alice@example.com
 *             password: StrongPass@123
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: Validation error
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Email already registered
 */
router.post('/register', register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive JWT + refresh token
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
 *           example:
 *             email: alice@example.com
 *             password: StrongPass@123
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/login', login);

/**
 * @openapi
 * /auth/verify-email/request:
 *   post:
 *     tags: [Auth]
 *     summary: Request new email verification token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *           example:
 *             email: alice@example.com
 *     responses:
 *       200:
 *         description: Request accepted
 *       400:
 *         description: Validation error
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/verify-email/request', requestEmailVerification);

/**
 * @openapi
 * /auth/verify-email/confirm:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email using token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *           example:
 *             token: 8b4d2f...verification-token
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid or expired token
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/verify-email/confirm', verifyEmail);

/**
 * @openapi
 * /auth/password-reset/request:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *           example:
 *             email: alice@example.com
 *     responses:
 *       200:
 *         description: Request accepted
 *       400:
 *         description: Validation error
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/password-reset/request', requestPasswordReset);

/**
 * @openapi
 * /auth/password-reset/confirm:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *           example:
 *             token: 7c1f3d...reset-token
 *             newPassword: NewStrongPass@123
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid or expired token
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/password-reset/confirm', resetPassword);

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
 *           example:
 *             refreshToken: 9f2a...refresh-token
 *     responses:
 *       200:
 *         description: Token refreshed
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid refresh token
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/refresh', refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout from current refresh token session
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
 *           example:
 *             refreshToken: 9f2a...refresh-token
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       400:
 *         description: Validation error
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/logout', logout);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Logout from all sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all sessions
 *       401:
 *         description: Missing or invalid token
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/logout-all', auth, logoutAll);

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
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.get('/me', auth, me);

module.exports = router;
