'use strict';

const { StatusCodes } = require('http-status-codes');

/**
 * Joi validation middleware factory
 * @param {Object} schema - Joi schema object with body/query/params
 */
const validate = (schema) => (req, res, next) => {
  const errors = [];

  if (schema.body) {
    const { error } = schema.body.validate(req.body, { abortEarly: false });
    if (error) errors.push(...error.details.map((d) => d.message));
  }
  if (schema.query) {
    const { error } = schema.query.validate(req.query, { abortEarly: false });
    if (error) errors.push(...error.details.map((d) => d.message));
  }
  if (schema.params) {
    const { error } = schema.params.validate(req.params, { abortEarly: false });
    if (error) errors.push(...error.details.map((d) => d.message));
  }

  if (errors.length > 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ errors });
  }

  next();
};

module.exports = { validate };
