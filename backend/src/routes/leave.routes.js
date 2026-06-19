'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/leave.controller');

const router = express.Router();
router.use(authenticate);

router.get('/',         ctrl.getLeaves);                            // all roles — filtered by role
router.post('/',        ctrl.createLeave);                          // any employee can request
router.patch('/:id/approve', authorize('SENIOR_MANAGER'), ctrl.approveLeave); // manager+ can approve
router.patch('/:id/reject',  authorize('SENIOR_MANAGER'), ctrl.rejectLeave);  // manager+ can reject
router.patch('/:id/cancel',  ctrl.cancelLeave);                     // employee cancels own

module.exports = router;
