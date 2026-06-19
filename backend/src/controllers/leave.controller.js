'use strict';

const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Employee submits a leave request
const createLeave = async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  const start = new Date(startDate);
  const end   = new Date(endDate);
  const days  = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (days <= 0) return res.status(StatusCodes.BAD_REQUEST).json({ error: 'End date must be after start date' });

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId: req.user.id,
      leaveType,
      startDate: start,
      endDate:   end,
      days,
      reason,
      status: 'PENDING',
    },
  });

  res.status(StatusCodes.CREATED).json(leave);
};

// Get leave requests — employee sees own, HR/Manager sees all or filtered
const getLeaves = async (req, res) => {
  const { status, employeeId, page = 1, limit = 20 } = req.query;
  const isEmployee = req.user.role === 'EMPLOYEE';

  const where = {
    ...(isEmployee ? { employeeId: req.user.id } : {}),
    ...(employeeId && !isEmployee ? { employeeId } : {}),
    ...(status ? { status } : {}),
  };

  const [total, leaves] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, position: true, department: { select: { name: true } } } },
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({ data: leaves, pagination: { total, page: parseInt(page) } });
};

// HR or Manager approves a leave
const approveLeave = async (req, res) => {
  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED', approvedBy: req.user.id, approvedAt: new Date() },
    include: { employee: { select: { firstName: true, lastName: true } } },
  });
  res.json(leave);
};

// HR or Manager rejects a leave
const rejectLeave = async (req, res) => {
  const { reason } = req.body;
  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED', rejectedReason: reason || 'Rejected by manager' },
    include: { employee: { select: { firstName: true, lastName: true } } },
  });
  res.json(leave);
};

// Employee cancels their own pending leave
const cancelLeave = async (req, res) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!leave) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Leave request not found' });
  if (leave.employeeId !== req.user.id) return res.status(StatusCodes.FORBIDDEN).json({ error: 'Not your leave request' });
  if (leave.status !== 'PENDING') return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Can only cancel pending requests' });

  const updated = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
  });
  res.json(updated);
};

module.exports = { createLeave, getLeaves, approveLeave, rejectLeave, cancelLeave };
