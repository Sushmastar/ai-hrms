/**
 * HRMS Mock Data Seeder — SQLite compatible
 * Usage: node prisma/seed.js [--reset]
 */
'use strict';

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const SEED_COUNT = parseInt(process.env.SEED_COUNT) || 5000;
const BATCH_SIZE = 50;

const DEPARTMENTS = [
  { name: 'Engineering', code: 'ENG' },
  { name: 'Human Resources', code: 'HR' },
  { name: 'Finance', code: 'FIN' },
  { name: 'Marketing', code: 'MKT' },
  { name: 'Sales', code: 'SLS' },
  { name: 'Operations', code: 'OPS' },
  { name: 'Product Management', code: 'PM' },
  { name: 'Customer Success', code: 'CS' },
  { name: 'Legal', code: 'LGL' },
  { name: 'Design', code: 'DES' },
  { name: 'Data Science', code: 'DS' },
  { name: 'IT Infrastructure', code: 'IT' },
];

const POSITIONS = {
  ENG: ['Software Engineer', 'Senior Engineer', 'Lead Engineer', 'DevOps Engineer', 'QA Engineer'],
  HR:  ['HR Specialist', 'HR Business Partner', 'Recruiter', 'L&D Specialist'],
  FIN: ['Financial Analyst', 'Accountant', 'Controller', 'Auditor'],
  MKT: ['Marketing Analyst', 'Content Strategist', 'Brand Manager', 'SEO Specialist'],
  SLS: ['Sales Executive', 'Account Manager', 'BDR', 'Key Account Manager'],
  OPS: ['Operations Analyst', 'Process Manager', 'Logistics Coordinator'],
  PM:  ['Product Manager', 'Associate PM', 'Senior PM', 'Product Owner'],
  CS:  ['Customer Success Manager', 'Support Engineer', 'Onboarding Specialist'],
  LGL: ['Legal Counsel', 'Paralegal', 'Compliance Officer'],
  DES: ['UI Designer', 'UX Researcher', 'Product Designer'],
  DS:  ['Data Scientist', 'ML Engineer', 'Data Analyst', 'Data Engineer'],
  IT:  ['Systems Admin', 'Network Engineer', 'Security Analyst', 'IT Support'],
};

const STATUSES = [
  'ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE',
  'ON_LEAVE','PROBATION','PROBATION','INACTIVE','TERMINATED',
];

async function reset() {
  process.stdout.write('Resetting database... ');
  await prisma.attendanceAnomaly.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.performanceKPI.deleteMany();
  await prisma.performanceReview.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.application.deleteMany();
  await prisma.job.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.payrollConfig.deleteMany();
  console.log('done');
}

async function seedDepartments() {
  const depts = [];
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.upsert({ where: { code: d.code }, create: d, update: {} });
    depts.push(dept);
  }
  return depts;
}

async function seedPayrollConfig() {
  await prisma.payrollConfig.create({
    data: {
      country: 'India', currency: 'INR',
      taxBrackets: JSON.stringify([
        { min: 0,       max: 250000,  rate: 0    },
        { min: 250000,  max: 500000,  rate: 0.05 },
        { min: 500000,  max: 1000000, rate: 0.20 },
        { min: 1000000, max: null,    rate: 0.30 },
      ]),
      pfRate: 0.12, insuranceRate: 0.005, overtimeRate: 1.5, isActive: true,
    },
  });
}

async function seedAdminUsers(departments) {
  const hrDept  = departments.find(d => d.code === 'HR');
  const engDept = departments.find(d => d.code === 'ENG');
  const users = [
    { no:1, fn:'System',  ln:'Admin',     email:'admin@fwcinc.com',    pw:'Admin@123',    role:'MANAGEMENT_ADMIN', pos:'Chief HR Officer',      sal:250000, dept:hrDept  },
    { no:2, fn:'Sarah',   ln:'Manager',   email:'manager@fwcinc.com',  pw:'Manager@123',  role:'SENIOR_MANAGER',   pos:'Senior Manager',         sal:150000, dept:hrDept  },
    { no:3, fn:'James',   ln:'Recruiter', email:'hr@fwcinc.com',       pw:'Hr@123',       role:'HR_RECRUITER',     pos:'Senior HR Recruiter',    sal:80000,  dept:hrDept  },
    { no:4, fn:'Alice',   ln:'Employee',  email:'emp001@fwcinc.com',   pw:'Emp@123',      role:'EMPLOYEE',         pos:'Software Engineer',      sal:70000,  dept:engDept },
  ];
  for (const u of users) {
    const hash = await bcrypt.hash(u.pw, 10);
    await prisma.employee.upsert({
      where: { email: u.email },
      create: {
        employeeId: `EMP${String(u.no).padStart(5,'0')}`,
        firstName: u.fn, lastName: u.ln, email: u.email,
        passwordHash: hash, role: u.role, status: 'ACTIVE',
        hireDate: new Date('2020-01-01'), salary: u.sal,
        position: u.pos, departmentId: u.dept?.id,
      },
      update: {},
    });
  }
  console.log('  Admin users seeded');
}

async function seedEmployees(departments) {
  const defaultHash = await bcrypt.hash('Welcome@123', 8);
  let created = 0;
  const startIdx = 5;

  for (let batch = 0; batch * BATCH_SIZE < SEED_COUNT; batch++) {
    const data = [];
    const batchStart = startIdx + batch * BATCH_SIZE;
    const batchEnd   = Math.min(batchStart + BATCH_SIZE, startIdx + SEED_COUNT);

    for (let i = batchStart; i < batchEnd; i++) {
      const dept      = departments[i % departments.length];
      const positions = POSITIONS[dept.code] || ['Analyst'];
      data.push({
        employeeId:   `EMP${String(i + 1).padStart(5,'0')}`,
        firstName:    faker.person.firstName(),
        lastName:     faker.person.lastName(),
        email:        `emp${String(i + 1).padStart(5,'0')}@fwcinc.com`,
        passwordHash: defaultHash,
        phone:        faker.helpers.fromRegExp('+91[6-9][0-9]{9}'),
        gender:       faker.helpers.arrayElement(['Male','Female','Non-binary']),
        address:      JSON.stringify({ city: faker.location.city(), state: faker.location.state(), country: 'India' }),
        role:         'EMPLOYEE',
        status:       STATUSES[i % STATUSES.length],
        hireDate:     faker.date.between({ from: '2018-01-01', to: new Date() }),
        salary:       faker.number.int({ min: 30000, max: 200000 }),
        position:     positions[i % positions.length],
        departmentId: dept.id,
      });
    }

    for (const row of data) {
      await prisma.employee.upsert({ where: { email: row.email }, create: row, update: {} });
    }
    created += data.length;
    if (batch % 20 === 0) process.stdout.write(`\r  Employees: ${created}/${SEED_COUNT}`);
  }
  process.stdout.write(`\r  Employees: ${created}/${SEED_COUNT} — done\n`);
}

async function seedAttendance(employeeIds) {
  // Seed 30 days x 500 employees = ~14,500 records (fast on SQLite)
  const today = new Date(); today.setHours(0,0,0,0);
  const DAYS   = 30;
  const SAMPLE = Math.min(500, employeeIds.length);
  const sample = employeeIds.slice(0, SAMPLE);

  const dates = [];
  for (let d = DAYS - 1; d >= 0; d--) {
    const dt = new Date(today); dt.setDate(today.getDate() - d);
    if (dt.getDay() !== 0 && dt.getDay() !== 6) dates.push(new Date(dt));
  }

  const EBATCH = 50;
  let total = 0;

  for (let i = 0; i < sample.length; i += EBATCH) {
    const rows = [];
    for (const empId of sample.slice(i, i + EBATCH)) {
      for (const date of dates) {
        if (Math.random() < 0.06) continue;
        const hour = faker.number.int({ min: 7, max: 10 });
        const min  = faker.number.int({ min: 0, max: 59 });
        const checkIn  = new Date(date); checkIn.setHours(hour, min, 0, 0);
        const wh       = faker.number.float({ min: 6, max: 11, fractionDigits: 1 });
        const checkOut = new Date(checkIn.getTime() + wh * 3600000);
        rows.push({
          employeeId: empId, date, checkIn, checkOut,
          status:    (hour > 9 || (hour === 9 && min > 15)) ? 'LATE' : 'PRESENT',
          workHours: wh,
          overtime:  Math.max(0, Math.round((wh - 8) * 10) / 10),
        });
      }
    }
    await prisma.attendance.createMany({ data: rows });
    total += rows.length;
    process.stdout.write(`\r  Attendance: ${Math.min(i + EBATCH, sample.length)}/${sample.length} employees`);
  }
  process.stdout.write(`\r  Attendance: ${total.toLocaleString()} records (${SAMPLE} employees, ${DAYS} days)\n`);
}

async function seedPayroll(employeeIds) {
  const LIMIT = Math.min(500, employeeIds.length);
  const periods = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    periods.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }

  const PBATCH = 50;
  let total = 0;
  for (let i = 0; i < LIMIT; i += PBATCH) {
    const rows = [];
    for (const empId of employeeIds.slice(i, i + PBATCH)) {
      const emp  = await prisma.employee.findUnique({ where: { id: empId }, select: { salary: true } });
      const base = emp?.salary || 50000;
      for (const period of periods) {
        const gross = base + faker.number.int({ min: 0, max: 3000 });
        const ded   = { tax: gross * 0.1, pf: gross * 0.12, insurance: gross * 0.005 };
        rows.push({
          employeeId: empId, period, baseSalary: base,
          allowances: 1000, overtime: faker.number.int({ min: 0, max: 1500 }),
          bonuses: 0, deductions: JSON.stringify(ded),
          grossPay: gross, netPay: gross - ded.tax - ded.pf - ded.insurance,
          status: 'COMPLETED', processedAt: new Date(),
        });
      }
    }
    await prisma.payrollRecord.createMany({ data: rows });
    total += rows.length;
  }
  console.log(`  Payroll: ${total.toLocaleString()} records — done`);
}

async function seedPerformanceReviews(employeeIds, adminId) {
  const LIMIT   = Math.min(300, employeeIds.length);
  const periods = ['Q1-2024','Q2-2024','Q3-2024','Q4-2024'];
  const rows    = [];
  for (const empId of employeeIds.slice(0, LIMIT)) {
    const score  = faker.number.float({ min: 45, max: 98, fractionDigits: 1 });
    const rating = score >= 90 ? 'EXCEPTIONAL'
      : score >= 75 ? 'EXCEEDS_EXPECTATIONS'
      : score >= 60 ? 'MEETS_EXPECTATIONS'
      : 'NEEDS_IMPROVEMENT';
    rows.push({
      employeeId: empId, reviewerId: adminId,
      reviewPeriod: faker.helpers.arrayElement(periods),
      rating, score,
      goals:         JSON.stringify({ targets: ['Delivery','Collaboration','Certs'] }),
      achievements:  faker.lorem.sentence(),
      areasToImprove:faker.lorem.sentence(),
      peerFeedback:  faker.lorem.paragraph(),
      sentimentScore:faker.number.float({ min: -0.3, max: 0.9, fractionDigits: 4 }),
    });
  }
  await prisma.performanceReview.createMany({ data: rows });
  console.log(`  Performance: ${rows.length} reviews — done`);
}

async function seedJobs(departments, adminId) {
  const titles = [
    'Senior Software Engineer','Product Manager','Data Scientist',
    'HR Business Partner','Marketing Manager','Sales Executive',
    'DevOps Lead','UX Designer','Financial Analyst','Customer Success Manager',
  ];
  const rows = titles.map((title, i) => ({
    title,
    description:  faker.lorem.paragraphs(2),
    requirements: JSON.stringify(['Bachelor degree','3+ years experience']),
    skills:       JSON.stringify(faker.helpers.arrayElements(['React','Python','SQL','AWS','Leadership','Excel'], 4)),
    experience:   faker.helpers.arrayElement(['0-2 years','2-4 years','4-7 years']),
    location:     faker.helpers.arrayElement(['Mumbai','Bangalore','Delhi','Remote']),
    salaryMin: 40000, salaryMax: 150000,
    status:       i < 7 ? 'OPEN' : 'CLOSED',
    departmentId: departments[i % departments.length].id,
    postedBy:     adminId,
  }));
  await prisma.job.createMany({ data: rows });
  console.log(`  Jobs: ${rows.length} postings — done`);
}

async function seedAnomalies(employeeIds) {
  const sample  = employeeIds.slice(0, 30);
  const records = await prisma.attendance.findMany({
    where: { employeeId: { in: sample } }, take: 60, orderBy: { date: 'desc' },
  });
  const types = ['LATE_CHECKIN','EARLY_CHECKOUT','MISSED_CHECKOUT','OVERTIME_EXCESS'];
  const rows  = records.map(r => ({
    attendanceId: r.id,
    employeeId:   r.employeeId,
    anomalyType:  faker.helpers.arrayElement(types),
    severity:     faker.number.int({ min: 1, max: 3 }),
    description:  faker.helpers.arrayElement([
      'Checked in 45 minutes late without notice',
      'Left 2 hours before scheduled shift end',
      'No checkout recorded for this shift',
      'Overtime exceeds weekly policy cap of 10h',
    ]),
    aiConfidence: faker.number.float({ min: 0.70, max: 0.99, fractionDigits: 4 }),
    resolved:     Math.random() < 0.3,
  }));
  if (rows.length > 0) await prisma.attendanceAnomaly.createMany({ data: rows });
  console.log(`  Anomalies: ${rows.length} records — done`);
}

async function main() {
  const isReset = process.argv.includes('--reset');
  console.log(`\n🚀 HRMS Seeder — target: ${SEED_COUNT.toLocaleString()} employees\n`);
  const t0 = Date.now();

  if (isReset) await reset();

  const departments = await seedDepartments();
  console.log(`  Departments: ${departments.length} created`);
  await seedPayrollConfig();
  console.log('  Payroll config seeded');
  await seedAdminUsers(departments);
  await seedEmployees(departments);

  const all     = await prisma.employee.findMany({ select: { id: true }, orderBy: { createdAt: 'asc' } });
  const ids     = all.map(e => e.id);
  const adminId = ids[0];

  await seedAttendance(ids);
  await seedPayroll(ids);
  await seedPerformanceReviews(ids, adminId);
  await seedJobs(departments, adminId);
  await seedAnomalies(ids);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Seeding complete in ${elapsed}s — ${ids.length.toLocaleString()} employees total`);
  console.log('\nDemo logins:');
  console.log('  admin@fwcinc.com    / Admin@123    (Management Admin)');
  console.log('  manager@fwcinc.com  / Manager@123  (Senior Manager)');
  console.log('  hr@fwcinc.com       / Hr@123       (HR Recruiter)');
  console.log('  emp001@fwcinc.com   / Emp@123      (Employee)\n');
}

main()
  .catch(e => { console.error('\nSeeder error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
