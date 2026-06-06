'use strict';

const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { emitToUser, emitToRole } = require('../config/socket');

const prisma = new PrismaClient();

const checkIn = async (req, res) => {
  const employeeId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });

  if (existing?.checkIn) {
    return res.status(StatusCodes.CONFLICT).json({ error: 'Already checked in today' });
  }

  const now = new Date();
  const hour = now.getHours();
  // Determine status: late if after 9:15 AM
  const status = hour >= 9 && now.getMinutes() > 15 ? 'LATE' : 'PRESENT';

  const attendance = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: today } },
    create: {
      employeeId,
      date: today,
      checkIn: now,
      status,
      location: req.body.location,
    },
    update: {
      checkIn: now,
      status,
      location: req.body.location,
    },
  });

  // Trigger AI anomaly detection asynchronously
  detectAnomaliesAsync(attendance.id, employeeId);

  res.status(StatusCodes.CREATED).json(attendance);
};

const checkOut = async (req, res) => {
  const employeeId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });

  if (!existing) return res.status(StatusCodes.NOT_FOUND).json({ error: 'No check-in found for today' });
  if (existing.checkOut) return res.status(StatusCodes.CONFLICT).json({ error: 'Already checked out today' });

  const now = new Date();
  const checkInTime = new Date(existing.checkIn);
  const workHoursRaw = (now - checkInTime) / (1000 * 60 * 60);
  const workHours = Math.round(workHoursRaw * 100) / 100;
  const overtime = Math.max(0, Math.round((workHours - 8) * 100) / 100);

  const attendance = await prisma.attendance.update({
    where: { employeeId_date: { employeeId, date: today } },
    data: { checkOut: now, workHours, overtime },
  });

  // Re-run anomaly detection on checkout
  detectAnomaliesAsync(attendance.id, employeeId);

  res.json(attendance);
};

const getEmployeeAttendance = async (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate, page = 1, limit = 31 } = req.query;

  const where = {
    employeeId,
    ...(startDate && endDate && {
      date: { gte: new Date(startDate), lte: new Date(endDate) },
    }),
  };

  const [total, records] = await prisma.$transaction([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
  ]);

  res.json({ data: records, pagination: { total, page: parseInt(page) } });
};

const getDailyReport = async (req, res) => {
  const date = req.params.date ? new Date(req.params.date) : new Date();
  date.setHours(0, 0, 0, 0);

  const stats = await prisma.attendance.groupBy({
    by: ['status'],
    where: { date },
    _count: { status: true },
  });

  const all = await prisma.employee.count({ where: { status: 'ACTIVE' } });
  const formatted = stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count.status }), {});

  res.json({
    date: date.toISOString().split('T')[0],
    totalEmployees: all,
    present: formatted.PRESENT || 0,
    absent: all - Object.values(formatted).reduce((a, b) => a + b, 0),
    late: formatted.LATE || 0,
    onLeave: formatted.ON_LEAVE || 0,
    workFromHome: formatted.WORK_FROM_HOME || 0,
    breakdown: formatted,
  });
};

const getAnomalies = async (req, res) => {
  const { resolved = 'false', severity, page = 1, limit = 20 } = req.query;

  const where = {
    resolved: resolved === 'true',
    ...(severity && { severity: parseInt(severity) }),
  };

  const [total, anomalies] = await prisma.$transaction([
    prisma.attendanceAnomaly.count({ where }),
    prisma.attendanceAnomaly.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        attendance: { select: { date: true, checkIn: true, checkOut: true } },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
  ]);

  res.json({ data: anomalies, pagination: { total, page: parseInt(page) } });
};

const resolveAnomaly = async (req, res) => {
  const anomaly = await prisma.attendanceAnomaly.update({
    where: { id: req.params.id },
    data: { resolved: true, resolvedBy: req.user.id, resolvedAt: new Date() },
  });
  res.json(anomaly);
};

// ── Internal AI anomaly detection call ──────────────────────────────────────

const detectAnomaliesAsync = async (attendanceId, employeeId) => {
  try {
    const response = await axios.post(
      `${process.env.AI_SERVICE_URL}/attendance/detect-anomaly`,
      { attendance_id: attendanceId, employee_id: employeeId },
      { timeout: 10000 }
    );

    if (response.data.anomalies?.length > 0) {
      const records = await prisma.attendanceAnomaly.createMany({
        data: response.data.anomalies.map((a) => ({
          attendanceId,
          employeeId,
          anomalyType: a.type,
          severity: a.severity,
          description: a.description,
          aiConfidence: a.confidence,
        })),
        skipDuplicates: true,
      });

      // Notify HR in real-time
      const highSeverity = response.data.anomalies.filter((a) => a.severity >= 2);
      if (highSeverity.length > 0) {
        emitToRole('HR_RECRUITER', 'attendance:anomaly', {
          employeeId,
          anomalies: highSeverity,
        });
      }
    }
  } catch (err) {
    // Non-critical — log but don't fail the request
    console.error('Anomaly detection error:', err.message);
  }
};

module.exports = { checkIn, checkOut, getEmployeeAttendance, getDailyReport, getAnomalies, resolveAnomaly };
