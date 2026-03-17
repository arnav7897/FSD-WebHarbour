const express = require('express');
const path = require('path');
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
const adminRoutes = require('../routes/admin.routes');
const userRoutes = require('../routes/user.auth');
const reportRoutes = require('../routes/report.routes');
const developerRoutes = require('../routes/developer.routes');
const { notFoundHandler, errorHandler } = require('../middleware/error.middleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'tmp', 'uploads')));

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
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'BAD_REQUEST',
                },
                message: {
                  type: 'string',
                  example: 'Validation error',
                },
                status: {
                  type: 'integer',
                  example: 400,
                },
                details: {
                  oneOf: [{ type: 'object' }, { type: 'array' }, { type: 'string' }],
                },
              },
              required: ['code', 'message', 'status'],
            },
          },
          required: ['success', 'error'],
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        NotFound: {
          description: 'Not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        Conflict: {
          description: 'Conflict',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Apps' },
      { name: 'Reviews' },
      { name: 'Reports' },
      { name: 'Users' },
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
app.use('/reports', reportRoutes);
app.use('/admin', adminRoutes);
app.use('/users', userRoutes);
app.use('/developer', developerRoutes);
app.use('/', catalogRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
