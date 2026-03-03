const STATUS_TO_CODE = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  500: 'INTERNAL_SERVER_ERROR',
};

const createHttpError = (status, message, code, details) => {
  const err = new Error(message);
  err.status = status;
  err.code = code || STATUS_TO_CODE[status] || 'ERROR';
  if (details !== undefined) err.details = details;
  return err;
};

const notFoundHandler = (req, res, next) => next(createHttpError(404, 'Not Found', 'NOT_FOUND'));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = Number(err.status) || 500;
  const code = err.code || STATUS_TO_CODE[status] || 'ERROR';
  const message = err.message || 'Internal Server Error';

  const payload = {
    success: false,
    error: {
      code,
      message,
      status,
    },
  };

  if (err.details !== undefined) {
    payload.error.details = err.details;
  }

  res.status(status).json(payload);
};

module.exports = {
  createHttpError,
  notFoundHandler,
  errorHandler,
};
