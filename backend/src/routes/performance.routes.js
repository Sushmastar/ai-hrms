'use strict';

const express = require('express');
const { authenticate, authorize, selfOrRole } = require('../middleware/auth');
const ctrl = require('../controllers/performance.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('HR_RECRUITER'), ctrl.getAll);
router.post('/', authorize('HR_RECRUITER'), ctrl.create);
router.get('/:employeeId', selfOrRole('HR_RECRUITER'), ctrl.getByEmployee);
router.put('/:id', authorize('HR_RECRUITER'), ctrl.update);
router.get('/:employeeId/kpis', selfOrRole('HR_RECRUITER'), ctrl.getKPIs);
router.post('/:employeeId/kpis', authorize('HR_RECRUITER'), ctrl.createKPI);

module.exports = router;
