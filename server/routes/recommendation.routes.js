const express = require('express');
const optionalAuth = require('../middleware/optionalAuth.middleware');
const { getHomeRecommendationsHandler } = require('../controllers/recommendation.controller');

const router = express.Router();

/**
 * @openapi
 * /recommendations/home:
 *   get:
 *     tags: [Apps]
 *     summary: Get homepage recommendations
 *     description: Returns recommended, top charts, and new & updated apps. If a Bearer token is provided, recommendations are personalized.
 *     parameters:
 *       - in: query
 *         name: recommendedLimit
 *         schema:
 *           type: integer
 *           example: 6
 *         description: Number of recommended apps to return.
 *       - in: query
 *         name: chartLimit
 *         schema:
 *           type: integer
 *           example: 3
 *         description: Number of top chart apps to return.
 *       - in: query
 *         name: updateLimit
 *         schema:
 *           type: integer
 *           example: 6
 *         description: Number of new & updated apps to return.
 *     responses:
 *       200:
 *         description: Homepage recommendation payload
 */
router.get('/home', optionalAuth, getHomeRecommendationsHandler);

module.exports = router;
