'use strict';

const { StatusCodes } = require('http-status-codes');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { cache } = require('../config/redis');
const logger = require('../config/logger');

const prisma = new PrismaClient();

const generateTokens = (employee) => {
  const payload = {
    id: employee.id,
    role: employee.role,
    email: employee.email,
    employeeId: employee.employeeId,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign(
    { id: employee.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const employee = await prisma.employee.findUnique({
    where: { email: email.toLowerCase() },
    include: { department: { select: { id: true, name: true } } },
  });

  if (!employee) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid credentials' });
  }

  if (employee.status === 'TERMINATED' || employee.status === 'INACTIVE') {
    return res.status(StatusCodes.FORBIDDEN).json({ error: 'Account is inactive or terminated' });
  }

  const isPasswordValid = await bcrypt.compare(password, employee.passwordHash);
  if (!isPasswordValid) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid credentials' });
  }

  const { accessToken, refreshToken } = generateTokens(employee);

  // Store refresh token hash in DB
  const hashedRefresh = await bcrypt.hash(refreshToken, 10);
  await prisma.employee.update({
    where: { id: employee.id },
    data: { refreshToken: hashedRefresh, lastLogin: new Date() },
  });

  // Cache user session data for fast middleware checks
  await cache.set(`session:${employee.id}`, {
    id: employee.id,
    role: employee.role,
    status: employee.status,
  }, 3600);

  logger.info(`Login: ${employee.email} [${employee.role}]`);

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: employee.id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role,
      position: employee.position,
      department: employee.department,
      profileImage: employee.profileImage,
    },
  });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Refresh token required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid or expired refresh token' });
  }

  const employee = await prisma.employee.findUnique({ where: { id: decoded.id } });
  if (!employee?.refreshToken) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Refresh token not found' });
  }

  const isValid = await bcrypt.compare(refreshToken, employee.refreshToken);
  if (!isValid) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid refresh token' });
  }

  const tokens = generateTokens(employee);
  const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
  await prisma.employee.update({
    where: { id: employee.id },
    data: { refreshToken: hashedRefresh },
  });

  res.json(tokens);
};

const logout = async (req, res) => {
  const token = req.token;
  const userId = req.user.id;

  // Blacklist current access token (TTL = remaining validity)
  try {
    const decoded = jwt.decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await cache.set(`blacklist:${token}`, 1, ttl);
    }
  } catch { /* ignore */ }

  // Remove refresh token from DB
  await prisma.employee.update({
    where: { id: userId },
    data: { refreshToken: null },
  });

  await cache.del(`session:${userId}`);
  res.json({ message: 'Logged out successfully' });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const employee = await prisma.employee.findUnique({ where: { id: userId } });

  const isValid = await bcrypt.compare(currentPassword, employee.passwordHash);
  if (!isValid) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Current password is incorrect' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.employee.update({ where: { id: userId }, data: { passwordHash } });

  res.json({ message: 'Password changed successfully' });
};

const getProfile = async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, employeeId: true, firstName: true, lastName: true,
      email: true, phone: true, dateOfBirth: true, gender: true,
      address: true, profileImage: true, role: true, status: true,
      hireDate: true, salary: true, position: true, lastLogin: true,
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, firstName: true, lastName: true, position: true } },
    },
  });

  res.json(employee);
};

module.exports = { login, refresh, logout, changePassword, getProfile };
