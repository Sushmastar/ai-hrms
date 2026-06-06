'use strict';

const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const getAll = async (req, res) => {
  const { reviewPeriod, departmentId, page = 1, limit = 20 } = req.query;
  const where = {
    ...(reviewPeriod && { reviewPeriod }),
    ...(departmentId && { employee: { departmentId } }),
  };

  const [total, reviews] = await prisma.$transaction([
    prisma.performanceReview.count({ where }),
    prisma.performanceReview.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, position: true } },
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({ data: reviews, pagination: { total, page: parseInt(page) } });
};

const create = async (req, res) => {
  const { employeeId, reviewPeriod, peerFeedback, ...data } = req.body;

  // Generate AI insights for peer feedback
  let aiInsights = null;
  let sentimentScore = null;

  if (peerFeedback) {
    try {
      const result = await axios.post(
        `${process.env.AI_SERVICE_URL}/performance/analyze`,
        { employee_id: employeeId, review_period: reviewPeriod, peer_feedback: peerFeedback },
        { timeout: 30000 }
      );
      aiInsights = result.data;
      sentimentScore = result.data.sentiment_score;
    } catch {
      // Non-blocking: store feedback without AI if service unavailable
    }
  }

  const review = await prisma.performanceReview.create({
    data: {
      employeeId,
      reviewPeriod,
      peerFeedback,
      reviewerId: req.user.id,
      aiInsights,
      sentimentScore,
      isAiGenerated: !!aiInsights,
      ...data,
    },
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  res.status(StatusCodes.CREATED).json(review);
};

const getByEmployee = async (req, res) => {
  const reviews = await prisma.performanceReview.findMany({
    where: { employeeId: req.params.employeeId },
    include: {
      reviewer: { select: { firstName: true, lastName: true, position: true } },
    },
    orderBy: { reviewPeriod: 'desc' },
  });
  res.json(reviews);
};

const update = async (req, res) => {
  const review = await prisma.performanceReview.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(review);
};

const getKPIs = async (req, res) => {
  const kpis = await prisma.performanceKPI.findMany({
    where: { employeeId: req.params.employeeId },
    orderBy: { recordedAt: 'desc' },
    take: 50,
  });
  res.json(kpis);
};

const createKPI = async (req, res) => {
  const kpi = await prisma.performanceKPI.create({
    data: { employeeId: req.params.employeeId, ...req.body },
  });
  res.status(StatusCodes.CREATED).json(kpi);
};

module.exports = { getAll, create, getByEmployee, update, getKPIs, createKPI };
