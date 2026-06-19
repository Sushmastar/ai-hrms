'use strict';

const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { saveFile } = require('../config/minio');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const prisma = new PrismaClient();
const j = (v) => (typeof v === 'string' ? v : JSON.stringify(v ?? []));
const p = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return v; } };

const listJobs = async (req, res) => {
  const { status = 'OPEN', department, page = 1, limit = 20 } = req.query;
  const where = {
    ...(status && { status }),
    ...(department && { departmentId: department }),
  };

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      include: { department: { select: { name: true } }, _count: { select: { applications: true } } },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({
    data: jobs.map((j_) => ({ ...j_, requirements: p(j_.requirements), skills: p(j_.skills) })),
    pagination: { total, page: parseInt(page) },
  });
};

const createJob = async (req, res) => {
  const { requirements, skills, ...rest } = req.body;
  const job = await prisma.job.create({
    data: { ...rest, requirements: j(requirements), skills: j(skills), postedBy: req.user.id },
  });
  res.status(StatusCodes.CREATED).json({ ...job, requirements: p(job.requirements), skills: p(job.skills) });
};

const getJob = async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: { department: true, _count: { select: { applications: true } } },
  });
  if (!job) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Job not found' });
  res.json({ ...job, requirements: p(job.requirements), skills: p(job.skills) });
};

const updateJob = async (req, res) => {
  const { requirements, skills, ...rest } = req.body;
  const data = { ...rest };
  if (requirements !== undefined) data.requirements = j(requirements);
  if (skills !== undefined) data.skills = j(skills);
  const job = await prisma.job.update({ where: { id: req.params.id }, data });
  res.json({ ...job, requirements: p(job.requirements), skills: p(job.skills) });
};

const deleteJob = async (req, res) => {
  await prisma.job.update({ where: { id: req.params.id }, data: { status: 'CLOSED' } });
  res.json({ message: 'Job closed' });
};

const listApplications = async (req, res) => {
  const { jobId, status, page = 1, limit = 20 } = req.query;
  const where = { ...(jobId && { jobId }), ...(status && { status }) };

  const [total, apps] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      include: { job: { select: { title: true } } },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: [{ aiScore: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);
  res.json({ data: apps, pagination: { total, page: parseInt(page) } });
};

const applyForJob = async (req, res) => {
  const { jobId } = req.params;
  const { applicantName, applicantEmail, coverLetter } = req.body;

  let resumeUrl = null;
  if (req.file) {
    try {
      const fileName = `resumes/${uuidv4()}${path.extname(req.file.originalname)}`;
      resumeUrl = await saveFile('resumes', fileName, req.file.buffer, req.file.mimetype);
    } catch (e) {
      console.error('File save error:', e.message);
    }
  }

  const application = await prisma.application.create({
    data: { jobId, applicantName, applicantEmail: applicantEmail.toLowerCase(), coverLetter, resumeUrl },
  });
  res.status(StatusCodes.CREATED).json(application);
};

const getApplication = async (req, res) => {
  const app = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: { job: true, interviews: true },
  });
  if (!app) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Application not found' });
  res.json(app);
};

const updateApplicationStatus = async (req, res) => {
  const { status, notes } = req.body;
  const app = await prisma.application.update({
    where: { id: req.params.id },
    data: { status, ...(notes && { notes }) },
  });
  res.json(app);
};

const triggerAIScreening = async (req, res) => {
  const application = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: { job: true },
  });
  if (!application) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Application not found' });

  try {
    const result = await axios.post(`${process.env.AI_SERVICE_URL}/resume/screen`, {
      application_id: application.id,
      resume_url: application.resumeUrl,
      // Use cover letter as resume text if no PDF uploaded
      resume_text: application.resumeText || application.coverLetter || `Applicant: ${application.applicantName}. Applied for ${application.job.title}.`,
      job_title: application.job.title,
      job_description: application.job.description,
      job_requirements: p(application.job.requirements),
      job_skills: p(application.job.skills),
    }, { timeout: 60000 });

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: {
        aiScore: result.data.score,
        aiScreeningData: j(result.data),
        status: 'SCREENING',
      },
    });
    return res.json(updated);
  } catch (e) {
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      error: 'AI service unavailable',
      detail: e.message,
    });
  }
};

const screenAllApplications = async (req, res) => {
  const { jobId } = req.params;
  const [job, applications] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.application.findMany({ where: { jobId, status: 'APPLIED' } }),
  ]);
  if (!job) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Job not found' });

  try {
    const result = await axios.post(`${process.env.AI_SERVICE_URL}/resume/screen-batch`, {
      job_id: jobId,
      job_title: job.title,
      job_description: job.description,
      job_requirements: p(job.requirements),
      job_skills: p(job.skills),
      application_ids: applications.map((a) => a.id),
    }, { timeout: 120000 });

    for (const r of result.data.results) {
      await prisma.application.update({
        where: { id: r.application_id },
        data: { aiScore: r.score, aiRankPosition: r.rank, aiScreeningData: j(r), status: 'SCREENING' },
      });
    }
    return res.json({ message: 'Batch screening complete', processed: result.data.results.length });
  } catch (e) {
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ error: 'AI service unavailable', detail: e.message });
  }
};

module.exports = {
  listJobs, createJob, getJob, updateJob, deleteJob,
  listApplications, applyForJob, getApplication, updateApplicationStatus,
  triggerAIScreening, screenAllApplications,
};
