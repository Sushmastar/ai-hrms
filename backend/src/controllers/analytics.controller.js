'use strict';

const { PrismaClient } = require('@prisma/client');
const { cache } = require('../config/redis');

const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
  const cacheKey = 'analytics:dashboard';
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalEmployees,
    activeEmployees,
    newHires,
    openJobs,
    pendingLeaves,
    todayAttendance,
    recentAnomalies,
  ] = await prisma.$transaction([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.employee.count({ where: { hireDate: { gte: startOfMonth } } }),
    prisma.job.count({ where: { status: 'OPEN' } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.attendance.count({ where: { date: new Date(now.toDateString()), status: 'PRESENT' } }),
    prisma.attendanceAnomaly.count({ where: { resolved: false } }),
  ]);

  const result = {
    totalEmployees,
    activeEmployees,
    newHires,
    openJobs,
    pendingLeaves,
    todayAttendance,
    recentAnomalies,
    generatedAt: now,
  };

  await cache.set(cacheKey, result, 300); // 5-min cache
  res.json(result);
};

const getHeadcountTrend = async (req, res) => {
  const months = parseInt(req.query.months) || 12;
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const count = await prisma.employee.count({
      where: { hireDate: { lte: end }, OR: [{ terminationDate: null }, { terminationDate: { gte: start } }] },
    });

    result.push({
      period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      count,
    });
  }

  res.json(result);
};

const getTurnoverRate = async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  const [avgActive, terminated] = await prisma.$transaction([
    prisma.employee.count({ where: { status: { in: ['ACTIVE', 'ON_LEAVE'] } } }),
    prisma.employee.count({
      where: { status: 'TERMINATED', terminationDate: { gte: start, lte: end } },
    }),
  ]);

  const turnoverRate = avgActive > 0 ? ((terminated / avgActive) * 100).toFixed(2) : 0;
  res.json({ year, terminated, avgActive, turnoverRate });
};

const getAttendanceHeatmap = async (req, res) => {
  const days = parseInt(req.query.days) || 90;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const data = await prisma.attendance.groupBy({
    by: ['date', 'status'],
    where: { date: { gte: since } },
    _count: { status: true },
    orderBy: { date: 'asc' },
  });

  const formatted = {};
  for (const d of data) {
    const key = d.date.toISOString().split('T')[0];
    if (!formatted[key]) formatted[key] = {};
    formatted[key][d.status] = d._count.status;
  }

  res.json(Object.entries(formatted).map(([date, statuses]) => ({ date, ...statuses })));
};

const getPayrollTrend = async (req, res) => {
  const months = parseInt(req.query.months) || 12;
  const periods = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const data = await prisma.payrollRecord.groupBy({
    by: ['period'],
    where: { period: { in: periods } },
    _sum: { netPay: true, grossPay: true },
    _count: { id: true },
    orderBy: { period: 'asc' },
  });

  res.json(data.map((d) => ({
    period: d.period,
    totalNetPay: Number(d._sum.netPay),
    totalGrossPay: Number(d._sum.grossPay),
    employeeCount: d._count.id,
  })));
};

module.exports = {
  getDashboardStats, getHeadcountTrend, getTurnoverRate, getAttendanceHeatmap, getPayrollTrend,
};
