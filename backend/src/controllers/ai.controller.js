'use strict';

const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { cache } = require('../config/redis');

const prisma = new PrismaClient();
const AI_URL = process.env.AI_SERVICE_URL;

// Helper — wraps AI service calls and returns clean errors
const callAI = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    const offlineCodes = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND'];
    if (offlineCodes.includes(err.code)) {
      const e = new Error('AI service is not running. Start it with: python -m uvicorn main:app --reload --port 8000');
      e.statusCode = 503;
      throw e;
    }
    if (err.response?.data) {
      const e = new Error(err.response.data.detail || err.response.data.error || 'AI service error');
      e.statusCode = err.response.status || 500;
      throw e;
    }
    throw err;
  }
};

// ── Health check proxy ───────────────────────────────────────────────────────

const checkAIHealth = async (req, res) => {
  try {
    const response = await axios.get(`${process.env.AI_SERVICE_URL}/health`, { timeout: 5000 });
    // AI service returns "healthy" — normalize to "online" for frontend
    res.json({ ...response.data, status: 'online' });
  } catch {
    res.status(503).json({ status: 'offline', error: 'AI service unreachable' });
  }
};

// ── Interview Bot ────────────────────────────────────────────────────────────

const startInterview = async (req, res) => {
  const { applicationId } = req.body;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });
  if (!application) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Application not found' });

  const sessionId = uuidv4();

  const result = await callAI(() => axios.post(`${AI_URL}/interview/start`, {
    session_id: sessionId,
    application_id: applicationId,
    applicant_name: application.applicantName,
    job_title: application.job.title,
    job_description: application.job.description,
    job_requirements: (() => {
      try { return JSON.parse(application.job.requirements || '[]'); } catch { return []; }
    })(),
  }, { timeout: 30000 }));

  // Cache session state
  await cache.set(`interview:${sessionId}`, {
    applicationId,
    jobTitle: application.job.title,
    startedAt: new Date().toISOString(),
  }, 3600);

  // Create interview record
  await prisma.interview.create({
    data: {
      applicationId,
      sessionId,
      transcript: JSON.stringify([{ role: 'assistant', content: result.data.opening_message, timestamp: new Date() }]),
    },
  });

  res.status(StatusCodes.CREATED).json({
    sessionId,
    openingMessage: result.data.opening_message,
  });
};

const sendInterviewMessage = async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  const session = await cache.get(`interview:${sessionId}`);
  if (!session) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Interview session not found or expired' });

  const interview = await prisma.interview.findUnique({ where: { sessionId } });
  if (!interview) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Interview not found' });

  const transcriptArr = typeof interview.transcript === 'string'
    ? JSON.parse(interview.transcript)
    : interview.transcript;

  const result = await callAI(() => axios.post(`${AI_URL}/interview/respond`, {
    session_id: sessionId,
    user_message: message,
    transcript: transcriptArr,
  }, { timeout: 30000 }));

  const updatedTranscript = [
    ...transcriptArr,
    { role: 'user', content: message, timestamp: new Date() },
    { role: 'assistant', content: result.data.response, timestamp: new Date() },
  ];

  await prisma.interview.update({
    where: { sessionId },
    data: { transcript: JSON.stringify(updatedTranscript) },
  });

  res.json({
    response: result.data.response,
    isComplete: result.data.is_complete || false,
    questionNumber: result.data.question_number,
  });
};

const endInterview = async (req, res) => {
  const { sessionId } = req.params;

  const interview = await prisma.interview.findUnique({ where: { sessionId } });
  if (!interview) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Interview not found' });

  const transcriptArr = typeof interview.transcript === 'string'
    ? JSON.parse(interview.transcript)
    : interview.transcript;

  const result = await callAI(() => axios.post(`${AI_URL}/interview/evaluate`, {
    session_id: sessionId,
    transcript: transcriptArr,
  }, { timeout: 30000 }));

  await prisma.interview.update({
    where: { sessionId },
    data: {
      overallScore: result.data.overall_score,
      sentimentScore: result.data.sentiment_score,
      aiAnalysis: JSON.stringify(result.data.analysis),
      duration: result.data.duration_seconds,
      completedAt: new Date(),
    },
  });

  await prisma.application.update({
    where: { id: interview.applicationId },
    data: {
      interviewScore: result.data.overall_score,
      interviewData: JSON.stringify(result.data),
      status: 'INTERVIEW_COMPLETED',
    },
  });

  await cache.del(`interview:${sessionId}`);

  res.json({
    score: result.data.overall_score,
    summary: result.data.summary,
    recommendation: result.data.recommendation,
  });
};

const getTranscript = async (req, res) => {
  const interview = await prisma.interview.findUnique({
    where: { sessionId: req.params.sessionId },
    include: { application: { select: { applicantName: true, job: { select: { title: true } } } } },
  });
  if (!interview) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Transcript not found' });
  res.json(interview);
};

// ── Performance AI ───────────────────────────────────────────────────────────

const predictPerformance = async (req, res) => {
  const { employeeId } = req.params;

  const [reviews, kpis] = await prisma.$transaction([
    prisma.performanceReview.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.performanceKPI.findMany({
      where: { employeeId },
      orderBy: { recordedAt: 'desc' },
      take: 24,
    }),
  ]);

  const result = await callAI(() => axios.post(`${AI_URL}/performance/predict`, {
    employee_id: employeeId,
    reviews: reviews.map((r) => ({
      period: r.reviewPeriod,
      score: Number(r.score),
      rating: r.rating,
      sentiment: Number(r.sentimentScore || 0),
    })),
    kpis: kpis.map((k) => ({
      metric: k.metric,
      value: Number(k.value),
      target: Number(k.target),
      period: k.period,
    })),
  }, { timeout: 30000 }));

  res.json(result.data);
};

const analyzePerformance = async (req, res) => {
  const { employeeId } = req.params;
  const { reviewPeriod, peerFeedback } = req.body;

  // First check employee exists — case-insensitive ID lookup
  const empIdUpper = employeeId.toUpperCase();
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { id: employeeId },
        { employeeId: empIdUpper },
        { employeeId: employeeId },
      ],
    },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!employee) {
    return res.status(StatusCodes.NOT_FOUND).json({
      error: `Employee "${employeeId}" not found. Use format EMP00005 (check Employees tab for valid IDs).`,
    });
  }

  try {
    const result = await axios.post(`${AI_URL}/performance/analyze`, {
      employee_id: employee.id,
      review_period: reviewPeriod,
      peer_feedback: peerFeedback,
    }, { timeout: 30000 });
    res.json(result.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        error: 'AI service is not running. Start it with: python -m uvicorn main:app --reload --port 8000',
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: err.response?.data?.detail || err.message || 'AI analysis failed',
    });
  }
};

// ── Shift Scheduling ─────────────────────────────────────────────────────────

const generateShiftSchedule = async (req, res) => {
  const { departmentId, weekStartDate, constraints } = req.body;

  const employees = await prisma.employee.findMany({
    where: { departmentId, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true },
  });

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      status: 'APPROVED',
      startDate: { lte: new Date(weekStartDate) },
      endDate: { gte: new Date(weekStartDate) },
    },
    select: { employeeId: true, startDate: true, endDate: true },
  });

  const result = await callAI(() => axios.post(`${AI_URL}/scheduling/generate`, {
    employees,
    leaves,
    week_start: weekStartDate,
    constraints: constraints || {},
  }, { timeout: 30000 }));

  res.json(result.data);
};

module.exports = {
  checkAIHealth,
  startInterview, sendInterviewMessage, endInterview, getTranscript,
  predictPerformance, analyzePerformance, generateShiftSchedule,
};
