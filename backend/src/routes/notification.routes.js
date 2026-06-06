'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;
  const where = {
    employeeId: req.user.id,
    ...(unreadOnly === 'true' && { isRead: false }),
  };

  const [total, notifications] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
  ]);

  res.json({ data: notifications, pagination: { total } });
});

router.patch('/:id/read', async (req, res) => {
  await prisma.notification.update({
    where: { id: req.params.id, employeeId: req.user.id },
    data: { isRead: true },
  });
  res.json({ success: true });
});

router.patch('/read-all', async (req, res) => {
  await prisma.notification.updateMany({
    where: { employeeId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true });
});

module.exports = router;
