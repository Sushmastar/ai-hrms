'use strict';

const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const j = (v) => (typeof v === 'string' ? v : JSON.stringify(v));
const p = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return v; } };

const processBatchPayroll = async (req, res) => {
  const { period } = req.body;
  if (!period) return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Period is required (YYYY-MM)' });

  const config = await prisma.payrollConfig.findFirst({ where: { isActive: true } });
  if (!config) return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No active payroll configuration found' });

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, salary: true, employeeId: true },
  });

  const [year, month] = period.split('-').map(Number);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);

  const taxBrackets = p(config.taxBrackets);

  const records = await Promise.all(
    employees.map(async (emp) => {
      const attendance = await prisma.attendance.findMany({
        where: { employeeId: emp.id, date: { gte: periodStart, lte: periodEnd } },
      });

      const workDays = attendance.filter((a) => a.status !== 'ABSENT').length;
      const totalOvertimeHours = attendance.reduce((s, a) => s + (a.overtime || 0), 0);

      const base = Number(emp.salary);
      const dailyRate = base / 22;
      const effectiveSalary = dailyRate * Math.max(workDays, 1);
      const overtimePay = totalOvertimeHours * (dailyRate / 8) * Number(config.overtimeRate);

      const pfAmount = effectiveSalary * Number(config.pfRate);
      const insuranceAmount = effectiveSalary * Number(config.insuranceRate);
      const taxAmount = calculateTax(effectiveSalary, taxBrackets);

      const grossPay = effectiveSalary + overtimePay;
      const netPay = Math.max(0, grossPay - pfAmount - insuranceAmount - taxAmount);

      return {
        employeeId: emp.id,
        period,
        baseSalary: base,
        allowances: 0,
        overtime: overtimePay,
        bonuses: 0,
        deductions: j({ tax: taxAmount, pf: pfAmount, insurance: insuranceAmount }),
        grossPay,
        netPay,
        status: 'COMPLETED',
        processedAt: new Date(),
      };
    })
  );

  for (const r of records) {
    await prisma.payrollRecord.upsert({
      where: { employeeId_period: { employeeId: r.employeeId, period: r.period } },
      create: r,
      update: r,
    });
  }

  res.json({
    message: `Payroll processed for ${period}`,
    totalEmployees: records.length,
    totalNetPay: records.reduce((s, r) => s + r.netPay, 0).toFixed(2),
  });
};

const getPayrollByPeriod = async (req, res) => {
  const records = await prisma.payrollRecord.findMany({
    where: { period: req.params.period },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, position: true } } },
    orderBy: { employee: { lastName: 'asc' } },
  });
  res.json(records.map((r) => ({ ...r, deductions: p(r.deductions) })));
};

const getEmployeePayrollHistory = async (req, res) => {
  const records = await prisma.payrollRecord.findMany({
    where: { employeeId: req.params.employeeId },
    orderBy: { period: 'desc' },
    take: 12,
  });
  res.json(records.map((r) => ({ ...r, deductions: p(r.deductions) })));
};

const getPaySlip = async (req, res) => {
  const { employeeId, period } = req.params;
  const [record, employee] = await Promise.all([
    prisma.payrollRecord.findUnique({ where: { employeeId_period: { employeeId, period } } }),
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        firstName: true, lastName: true, employeeId: true, position: true,
        hireDate: true, department: { select: { name: true } },
      },
    }),
  ]);
  if (!record) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Pay slip not found' });
  res.json({ employee, payroll: { ...record, deductions: p(record.deductions) }, generatedAt: new Date() });
};

const getPayrollConfig = async (req, res) => {
  const config = await prisma.payrollConfig.findFirst({ where: { isActive: true } });
  if (!config) return res.json(null);
  res.json({ ...config, taxBrackets: p(config.taxBrackets) });
};

const updatePayrollConfig = async (req, res) => {
  const { id, taxBrackets, ...data } = req.body;
  const payload = { ...data, taxBrackets: j(taxBrackets) };
  const config = id
    ? await prisma.payrollConfig.update({ where: { id }, data: payload })
    : await prisma.payrollConfig.create({ data: { ...payload, isActive: true } });
  res.json({ ...config, taxBrackets: p(config.taxBrackets) });
};

function calculateTax(income, brackets) {
  if (!Array.isArray(brackets)) return income * 0.1;
  let tax = 0;
  for (const b of brackets) {
    if (income > b.min) {
      const taxable = Math.min(income, b.max ?? Infinity) - b.min;
      tax += taxable * b.rate;
    }
  }
  return tax;
}

module.exports = {
  processBatchPayroll, getPayrollByPeriod, getEmployeePayrollHistory,
  getPaySlip, getPayrollConfig, updatePayrollConfig,
};
