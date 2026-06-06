'use strict';

const { StatusCodes } = require('http-status-codes');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { cache } = require('../config/redis');

const prisma = new PrismaClient();

const EMPLOYEE_SELECT = {
  id: true, employeeId: true, firstName: true, lastName: true,
  email: true, phone: true, role: true, status: true, hireDate: true,
  salary: true, position: true, profileImage: true, gender: true,
  department: { select: { id: true, name: true, code: true } },
  manager: { select: { id: true, firstName: true, lastName: true } },
  createdAt: true, updatedAt: true,
};

const getAll = async (req, res) => {
  const {
    page = 1, limit = 20, search = '', department, status, role, sortBy = 'createdAt', order = 'desc',
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    AND: [
      search ? {
        OR: [
          { firstName: { contains: search } },
          { lastName:  { contains: search } },
          { email:     { contains: search } },
          { employeeId:{ contains: search } },
        ],
      } : {},
      department ? { departmentId: department } : {},
      status ? { status } : {},
      role ? { role } : {},
    ],
  };

  const [total, employees] = await prisma.$transaction([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      select: EMPLOYEE_SELECT,
      skip,
      take,
      orderBy: { [sortBy]: order },
    }),
  ]);

  res.json({
    data: employees,
    pagination: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  });
};

const create = async (req, res) => {
  const { password, departmentId, ...data } = req.body;

  // Generate a unique employee ID — find the highest existing number and go one above
  const last = await prisma.employee.findFirst({
    where: { employeeId: { startsWith: 'EMP' } },
    orderBy: { employeeId: 'desc' },
    select: { employeeId: true },
  });
  const lastNum = last ? parseInt(last.employeeId.replace('EMP', ''), 10) : 0;
  const employeeId = `EMP${String(lastNum + 1).padStart(5, '0')}`;

  // departmentId might be a dept code (e.g. "ENG") or a UUID — resolve to UUID
  let resolvedDeptId = departmentId || null;
  if (departmentId && departmentId.length <= 5) {
    // Looks like a code, look up the actual UUID
    const dept = await prisma.department.findUnique({ where: { code: departmentId } });
    resolvedDeptId = dept?.id || null;
  }

  const passwordHash = await bcrypt.hash(password || 'Welcome@123', 12);

  // Check for duplicate email early with a clear message
  const existing = await prisma.employee.findUnique({
    where: { email: (data.email || '').toLowerCase() },
  });
  if (existing) {
    return res.status(409).json({ error: `Email ${data.email} is already registered (${existing.employeeId})` });
  }

  const employee = await prisma.employee.create({
    data: {
      ...data,
      employeeId,
      passwordHash,
      email: data.email.toLowerCase(),
      departmentId: resolvedDeptId,
      // Ensure hireDate is a full ISO DateTime — handle "YYYY-MM-DD" from forms
      hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
    },
    select: EMPLOYEE_SELECT,
  });

  await cache.delPattern('employees:*');
  res.status(StatusCodes.CREATED).json(employee);
};

const getById = async (req, res) => {
  const cacheKey = `employee:${req.params.id}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const employee = await prisma.employee.findFirst({
    where: {
      OR: [{ id: req.params.id }, { employeeId: req.params.id }],
    },
    select: { ...EMPLOYEE_SELECT, dateOfBirth: true, address: true, departmentId: true },
  });

  if (!employee) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Employee not found' });

  await cache.set(cacheKey, employee, 300);
  res.json(employee);
};

const update = async (req, res) => {
  const { id } = req.params;
  const { passwordHash, employeeId, ...data } = req.body; // prevent overwriting sensitive fields

  const employee = await prisma.employee.update({
    where: { id },
    data,
    select: EMPLOYEE_SELECT,
  });

  await cache.del(`employee:${id}`);
  res.json(employee);
};

const deactivate = async (req, res) => {
  const { id } = req.params;
  const employee = await prisma.employee.update({
    where: { id },
    data: { status: 'INACTIVE', terminationDate: new Date() },
    select: EMPLOYEE_SELECT,
  });

  await cache.del(`employee:${id}`);
  res.json({ message: 'Employee deactivated', employee });
};

const getDirectReports = async (req, res) => {
  const reports = await prisma.employee.findMany({
    where: { managerId: req.params.id },
    select: EMPLOYEE_SELECT,
  });
  res.json(reports);
};

const getByDepartment = async (req, res) => {
  const employees = await prisma.employee.findMany({
    where: { departmentId: req.params.deptId, status: 'ACTIVE' },
    select: EMPLOYEE_SELECT,
    orderBy: { firstName: 'asc' },
  });
  res.json(employees);
};

module.exports = { getAll, create, getById, update, deactivate, getDirectReports, getByDepartment };
