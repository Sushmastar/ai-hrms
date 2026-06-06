'use strict';

const { StatusCodes } = require('http-status-codes');
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';

  // Prisma errors
  if (err.code === 'P2002') {
    statusCode = StatusCodes.CONFLICT;
    const field = err.meta?.target?.[0] || 'field';
    message = `Duplicate value for ${field}`;
  } else if (err.code === 'P2025') {
    statusCode = StatusCodes.NOT_FOUND;
    message = 'Record not found';
  } else if (err.code === 'P2003') {
    statusCode = StatusCodes.BAD_REQUEST;
    message = 'Foreign key constraint violation';
  }

  // Validation errors
  if (err.name === 'ValidationError' || err.isJoi) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = err.details?.map((d) => d.message).join(', ') || err.message;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = 'Invalid token';
  }

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} — ${message}`, {
      stack: err.stack,
      body: req.body,
      user: req.user?.id,
    });
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
