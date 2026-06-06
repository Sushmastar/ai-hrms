'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/analytics.controller');

const router = express.Router();
router.use(authenticate);

router.get('/dashboard', authorize('HR_RECRUITER'), ctrl.getDashboardStats);
router.get('/headcount', authorize('HR_RECRUITER'), ctrl.getHeadcountTrend);
router.get('/turnover', authorize('HR_RECRUITER'), ctrl.getTurnoverRate);
router.get('/attendance-heatmap', authorize('HR_RECRUITER'), ctrl.getAttendanceHeatmap);
router.get('/payroll-trend', authorize('HR_RECRUITER'), ctrl.getPayrollTrend);

module.exports = router;
