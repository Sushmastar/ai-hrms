'use strict';

const express = require('express');
const { authenticate, authorize, selfOrRole } = require('../middleware/auth');
const ctrl = require('../controllers/payroll.controller');

const router = express.Router();
router.use(authenticate);

router.post('/process', authorize('MANAGEMENT_ADMIN'), ctrl.processBatchPayroll);
router.get('/period/:period', authorize('HR_RECRUITER'), ctrl.getPayrollByPeriod);
router.get('/:employeeId/history', selfOrRole('HR_RECRUITER'), ctrl.getEmployeePayrollHistory);
router.get('/:employeeId/slip/:period', selfOrRole('HR_RECRUITER'), ctrl.getPaySlip);
router.get('/config', authorize('MANAGEMENT_ADMIN'), ctrl.getPayrollConfig);
router.put('/config', authorize('MANAGEMENT_ADMIN'), ctrl.updatePayrollConfig);

module.exports = router;
