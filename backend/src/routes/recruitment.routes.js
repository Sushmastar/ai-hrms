'use strict';

const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/recruitment.controller');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// Jobs
router.get('/jobs', ctrl.listJobs);
router.post('/jobs', authorize('HR_RECRUITER'), ctrl.createJob);
router.get('/jobs/:id', ctrl.getJob);
router.put('/jobs/:id', authorize('HR_RECRUITER'), ctrl.updateJob);
router.delete('/jobs/:id', authorize('HR_RECRUITER'), ctrl.deleteJob);

// Applications
router.get('/applications', authorize('HR_RECRUITER'), ctrl.listApplications);
router.post('/apply/:jobId', upload.single('resume'), ctrl.applyForJob);
router.get('/applications/:id', authorize('HR_RECRUITER'), ctrl.getApplication);
router.patch('/applications/:id/status', authorize('HR_RECRUITER'), ctrl.updateApplicationStatus);

// AI Screening
router.post('/applications/:id/screen', authorize('HR_RECRUITER'), ctrl.triggerAIScreening);
router.post('/jobs/:jobId/screen-all', authorize('HR_RECRUITER'), ctrl.screenAllApplications);

module.exports = router;
