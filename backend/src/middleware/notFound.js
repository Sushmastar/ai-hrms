'use strict';

const { StatusCodes } = require('http-status-codes');

const notFound = (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

module.exports = { notFound };
