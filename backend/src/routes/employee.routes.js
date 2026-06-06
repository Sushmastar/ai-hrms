'use strict';

const express = require('express');
const { authenticate, authorize, selfOrRole } = require('../middleware/auth');
const ctrl = require('../controllers/employee.controller');

const router = express.Router();
router.use(authenticate);

// List & create
router.get('/', authorize('HR_RECRUITER'), ctrl.getAll);
router.post('/', authorize('HR_RECRUITER'), ctrl.create);

// Individual operations
router.get('/:id', selfOrRole('HR_RECRUITER'), ctrl.getById);
router.put('/:id', selfOrRole('HR_RECRUITER'), ctrl.update);
router.delete('/:id', authorize('MANAGEMENT_ADMIN'), ctrl.deactivate);

// Hierarchy
router.get('/:id/reports', authorize('SENIOR_MANAGER'), ctrl.getDirectReports);

// Department bulk
router.get('/department/:deptId', authorize('HR_RECRUITER'), ctrl.getByDepartment);

module.exports = router;
