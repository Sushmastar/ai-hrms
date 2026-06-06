'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/ai.controller');

const router = express.Router();
router.use(authenticate);

// Health check (no role needed — just needs auth)
router.get('/health', ctrl.checkAIHealth);

// Conversational Interview Bot
router.post('/interview/start', authorize('HR_RECRUITER'), ctrl.startInterview);
router.post('/interview/:sessionId/message', authorize('HR_RECRUITER'), ctrl.sendInterviewMessage);
router.post('/interview/:sessionId/end', authorize('HR_RECRUITER'), ctrl.endInterview);
router.get('/interview/:sessionId/transcript', authorize('HR_RECRUITER'), ctrl.getTranscript);

// Performance AI — HR_RECRUITER and above can use these
router.get('/performance/:employeeId/predict', authorize('HR_RECRUITER'), ctrl.predictPerformance);
router.post('/performance/:employeeId/analyze', authorize('HR_RECRUITER'), ctrl.analyzePerformance);

// Shift Scheduling
router.post('/scheduling/generate', authorize('HR_RECRUITER'), ctrl.generateShiftSchedule);

module.exports = router;
