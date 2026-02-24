const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const { NODE_ENV, PORT } = require('../config/env');
const { SERVICE_NAME } = require('../config/constants');
const authRoutes = require('../routes/auth.routes');
const appRoutes = require('../routes/app.routes');
const reviewRoutes = require('../routes/review.routes');
const catalogRoutes = require('../routes/catalog.routes');

const app = express();

app.use(cors());
app.use(express.json());

if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'WebHarbour API',
      version: '0.1.0',
      description: 'Web-based App Marketplace API (Phase 1)',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Local development',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Apps' },
      { name: 'Reviews' },
      { name: 'Developer' },
      { name: 'Admin' },
    ],
  },
  apis: ['src/**/*.js', 'routes/**/*.js'],
});

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    time: new Date().toISOString(),
  });
});

app.get('/openapi.json', (req, res) => {
  res.json(swaggerSpec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/auth', authRoutes);
app.use('/apps', appRoutes);
app.use('/apps', reviewRoutes);
app.use('/', catalogRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
