'use strict';

const express = require('express');
const { authenticate, authorize, selfOrRole } = require('../middleware/auth');
const ctrl = require('../controllers/attendance.controller');

const router = express.Router();
router.use(authenticate);

router.post('/check-in', ctrl.checkIn);
router.post('/check-out', ctrl.checkOut);
router.get('/daily/:date?', authorize('HR_RECRUITER'), ctrl.getDailyReport);
router.get('/anomalies', authorize('HR_RECRUITER'), ctrl.getAnomalies);
router.patch('/anomalies/:id/resolve', authorize('HR_RECRUITER'), ctrl.resolveAnomaly);
router.get('/:employeeId', selfOrRole('HR_RECRUITER'), ctrl.getEmployeeAttendance);

module.exports = router;
