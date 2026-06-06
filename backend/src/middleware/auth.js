'use strict';

const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const { cache } = require('../config/redis');

const prisma = new PrismaClient();

// Role hierarchy levels
const ROLE_LEVELS = {
  MANAGEMENT_ADMIN: 4,
  SENIOR_MANAGER: 3,
  HR_RECRUITER: 2,
  EMPLOYEE: 1,
};

/**
 * Authenticate request via JWT Bearer token
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];

  // Check token blacklist (logged-out tokens)
  const isBlacklisted = await cache.exists(`blacklist:${token}`);
  if (isBlacklisted) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Token has been revoked' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB (ensures disabled accounts are blocked)
    const employee = await prisma.employee.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, status: true, email: true, employeeId: true, departmentId: true },
    });

    if (!employee) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'User not found' });
    }

    if (employee.status === 'TERMINATED' || employee.status === 'INACTIVE') {
      return res.status(StatusCodes.FORBIDDEN).json({ error: 'Account is inactive' });
    }

    req.user = employee;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid access token' });
  }
};

/**
 * Authorize by minimum role level
 * Usage: authorize('HR_RECRUITER') — allows HR_RECRUITER and above
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Not authenticated' });
    }

    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    const requiredLevel = Math.min(...roles.map((r) => ROLE_LEVELS[r] || 0));

    if (userLevel < requiredLevel) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
};

/**
 * Allow access only to own resource or higher-role users
 * Usage: selfOrRole('HR_RECRUITER') — employee can access own, HR+ can access all
 */
const selfOrRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Not authenticated' });

    const targetId = req.params.id || req.params.employeeId;
    const isSelf = req.user.id === targetId || req.user.employeeId === targetId;
    const hasRole = (ROLE_LEVELS[req.user.role] || 0) >= (ROLE_LEVELS[minRole] || 0);

    if (!isSelf && !hasRole) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: 'Access denied' });
    }

    next();
  };
};

module.exports = { authenticate, authorize, selfOrRole, ROLE_LEVELS };
