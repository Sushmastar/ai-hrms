'use strict';

const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/auth.controller');

const router = express.Router();

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
};

const refreshSchema = {
  body: Joi.object({ refreshToken: Joi.string().required() }),
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, and a number',
      }),
  }),
};

router.post('/login', validate(loginSchema), ctrl.login);
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.put('/password', authenticate, validate(changePasswordSchema), ctrl.changePassword);
router.get('/profile', authenticate, ctrl.getProfile);

module.exports = router;
