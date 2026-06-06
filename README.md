# 🚀 AI-Powered Human Resource Management System
### FWC Inc. — SD-1 AI/ML Hackathon Submission

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_API-Free_Tier-4285F4?style=flat-square&logo=google&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Local_DB-003B57?style=flat-square&logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

**A next-generation HRMS powered by Google Gemini AI — built for 5,000+ employees**

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Demo Credentials](#demo-credentials)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [AI Features Guide](#ai-features-guide)

---

## Overview

This project is a production-grade, full-stack Human Resource Management System that uses artificial intelligence to automate key HR operations. Built for the FWC Inc. SD-1 AI/ML Hackathon, it demonstrates how modern AI can transform traditional HR workflows.

**Key highlights:**
- 5,004 simulated employee records with realistic attendance, payroll, and performance data
- 4 distinct AI-powered modules using Google Gemini API (free tier)
- Role-Based Access Control with 4 separate user levels
- Real-time anomaly detection on attendance data
- Fully responsive UI built with Next.js and TailwindCSS

---

## Features

### 🔐 Multi-Role Authentication & Dashboards

| Role | Access Level | Key Capabilities |
|---|---|---|
| Management Admin | Full access | All data, payroll processing, system config |
| Senior Manager | Department level | Team analytics, performance reviews, approvals |
| HR Recruiter | HR operations | Employee CRUD, recruitment, attendance, AI tools |
| Employee | Personal only | Own attendance, pay slips, performance history |

### 🤖 AI Feature 1 — Autonomous Resume Screening
- Extracts text from PDF resumes using `pdfplumber`
- Scores each resume 0–100 against job description using Gemini
- Identifies matched skills, skill gaps, and strengths
- Batch processes all applications for a job in one click
- Returns ranking, recommendation (Strong Yes / Yes / Maybe / No)

### 💬 AI Feature 2 — Conversational Interview Bot
- Gemini-powered interviewer persona ("Alex from FWC Inc.")
- Dynamically generates 5–7 role-specific interview questions
- Maintains multi-turn conversation with full context
- Evaluates transcript for communication, technical knowledge, cultural fit
- Produces hire/reject recommendation with detailed analysis

### 📊 AI Feature 3 — Performance Analytics
- Analyzes historical review scores and KPI data
- Predicts next-quarter performance score
- VADER sentiment analysis on peer feedback text
- Detects flight risk and promotion readiness
- Flags sudden performance drops as anomalies

### ⏱️ AI Feature 4 — Attendance & Payroll Intelligence
- Real-time anomaly detection on every check-in/check-out
- Rule-based engine detects: late arrivals, early exits, missed checkouts, overtime excess
- AI pattern analysis identifies habitual behavioral issues over 30-day windows
- Automated payroll calculation with tax brackets, PF, and insurance deductions
- AI-generated shift scheduling optimized around approved leaves

### 📁 Standard HR Operations
- Full employee lifecycle CRUD with searchable table (5,000+ records)
- Attendance tracking with check-in/check-out buttons
- Leave request management
- Pay slip generation with deduction breakdown
- Job posting and application pipeline management

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14, React 18, TailwindCSS | Responsive UI, App Router |
| **UI Components** | Radix UI, ShadCN, Recharts | Accessible components, data charts |
| **State Management** | Zustand, React Query | Client state, server state caching |
| **Backend API** | Node.js 20, Express 5 | REST API, WebSocket |
| **ORM** | Prisma 5 | Type-safe DB queries |
| **Database** | SQLite (local) / PostgreSQL (prod) | Data storage |
| **Auth** | JWT (RS256), bcrypt | Secure authentication |
| **AI Service** | Python 3.9, FastAPI | AI microservice |
| **AI Model** | Google Gemini 1.5 Flash | LLM for all AI features |
| **PDF Processing** | pdfplumber, PyMuPDF | Resume text extraction |
| **Sentiment Analysis** | NLTK VADER + Gemini | Feedback analysis |
| **Real-time** | Socket.IO | Live anomaly notifications |

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Next.js 14 Frontend             │
│   TailwindCSS + Recharts + Zustand      │
└───────────────┬─────────────────────────┘
                │ HTTP / WebSocket
┌───────────────▼─────────────────────────┐
│       Node.js + Express API             │
│   JWT Auth  ·  RBAC  ·  Socket.IO       │
│                                         │
│  /auth  /employees  /attendance         │
│  /payroll  /performance  /recruitment   │
│  /analytics  /ai  /notifications        │
└──────┬─────────────────┬────────────────┘
       │                 │
┌──────▼──────┐  ┌───────▼──────────────┐
│   SQLite    │  │  Python FastAPI       │
│  (Prisma)   │  │  AI Microservice      │
│             │  │                       │
│  5,004 emps │  │  /resume/screen       │
│  10K+ attend│  │  /interview/start     │
│  3K payroll │  │  /performance/predict │
│  300 reviews│  │  /attendance/detect   │
└─────────────┘  │  /scheduling/generate │
                 └───────────────────────┘
                          │
                 ┌────────▼──────────────┐
                 │   Google Gemini API   │
                 │   (gemini-1.5-flash)  │
                 └───────────────────────┘
```

---

## Quick Start

### Prerequisites

| Tool | Version | Download |
|---|---|---|
| Node.js | >= 20.x | [nodejs.org](https://nodejs.org) |
| Python | >= 3.9 | [python.org](https://python.org) |
| Gemini API Key | Free | [aistudio.google.com](https://aistudio.google.com/app/apikey) |

### Step 1 — Clone & Setup Environment

```bash
git clone https://github.com/your-org/ai-hrms.git
cd ai-hrms
```

Copy environment files:
```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
copy ai-service\.env.example ai-service\.env
```

Add your Gemini API key to `ai-service\.env`:
```env
GEMINI_API_KEY=your_key_here
```

### Step 2 — Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (new terminal)
cd frontend
npm install

# AI Service (new terminal)
cd ai-service
pip install -r requirements.txt
```

### Step 3 — Setup Database & Seed Data

```bash
cd backend
npx prisma db push
node prisma/seed.js
```

This creates the SQLite database and seeds **5,004 employees** with:
- 10,375 attendance records (30 days × 500 employees)
- 3,000 payroll records (6 months × 500 employees)
- 300 performance reviews
- 10 job postings
- 60 attendance anomalies

### Step 4 — Start All Services

Open **3 separate terminals:**

```bash
# Terminal 1 — Backend API (port 5000)
cd backend
npm run dev
```

```bash
# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

```bash
# Terminal 3 — AI Service (port 8000)
cd ai-service
python -m uvicorn main:app --reload --port 8000
```

### Step 5 — Open the App

Navigate to **http://localhost:3000**

---

## Environment Variables

### `backend/.env`

```env
NODE_ENV=development
PORT=5000

# Database (SQLite for local, change to PostgreSQL for production)
DATABASE_URL="file:./dev.db"

# JWT Secrets (change these before any real deployment)
JWT_SECRET=your-secret-key-min-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-min-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# AI Service URL
AI_SERVICE_URL=http://localhost:8000

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=AI-HRMS
NEXT_PUBLIC_COMPANY_NAME=FWC Inc.
```

### `ai-service/.env`

```env
# Required — get free key at aistudio.google.com
GEMINI_API_KEY=your_gemini_api_key_here

TEMPERATURE=0.3
MAX_TOKENS=8192
LOG_LEVEL=INFO
```

---

## Demo Credentials

After running the seeder, these accounts are ready to use:

| Role | Email | Password | Access |
|---|---|---|---|
| Management Admin | admin@fwcinc.com | Admin@123 | Full system |
| Senior Manager | manager@fwcinc.com | Manager@123 | Team + analytics |
| HR Recruiter | hr@fwcinc.com | Hr@123 | HR operations + AI tools |
| Employee | emp001@fwcinc.com | Emp@123 | Personal data only |

> All 5,004 seeded employees can also log in with their generated email (`emp00005@fwcinc.com`, etc.) and the default password `Welcome@123`.

---

## Project Structure

```
ai-hrms/
│
├── backend/                        # Node.js Express API
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema (15 models)
│   │   └── seed.js                 # Mock data generator (5,000+ employees)
│   └── src/
│       ├── config/                 # Redis, MinIO, Socket.IO, Logger
│       ├── controllers/            # Business logic (8 controllers)
│       ├── middleware/             # Auth, RBAC, validation, errors
│       └── routes/                 # Express routers (9 route files)
│
├── frontend/                       # Next.js 14 application
│   └── src/
│       ├── app/                    # App Router pages (17 pages)
│       │   ├── dashboard/          # 4 role-specific dashboards
│       │   ├── employees/          # Employee management + add form
│       │   ├── attendance/         # Attendance + anomaly list
│       │   ├── payroll/            # Payroll processing + pay slips
│       │   ├── performance/        # Performance reviews
│       │   ├── recruitment/        # Jobs + applications + AI screening
│       │   ├── ai/                 # AI tools hub
│       │   ├── profile/            # User profile
│       │   └── settings/           # Password change
│       ├── components/             # Shared UI components
│       ├── lib/                    # Axios instance with auth interceptor
│       └── store/                  # Zustand auth store
│
└── ai-service/                     # Python FastAPI microservice
    ├── main.py                     # FastAPI app entry point
    ├── config.py                   # Settings from .env
    ├── routers/
    │   ├── resume.py               # AI Feature 1: Resume screening
    │   ├── interview.py            # AI Feature 2: Interview bot
    │   ├── performance.py          # AI Feature 3: Performance analytics
    │   ├── attendance.py           # AI Feature 4: Anomaly detection
    │   └── scheduling.py          # Shift schedule generation
    └── services/
        ├── gemini_client.py        # Gemini API wrapper with retry logic
        └── pdf_extractor.py        # PDF text extraction (pdfplumber + PyMuPDF)
```

---

## API Reference

Interactive API documentation is available at:
- **Backend:** `http://localhost:5000/api/docs` *(Swagger)*
- **AI Service:** `http://localhost:8000/docs` *(FastAPI auto-docs)*

### Core Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Login, returns JWT tokens |
| `POST` | `/api/auth/refresh` | Public | Refresh access token |
| `GET` | `/api/employees` | HR+ | List all employees (paginated) |
| `POST` | `/api/employees` | HR+ | Create new employee |
| `POST` | `/api/attendance/check-in` | Any | Employee check-in |
| `GET` | `/api/attendance/anomalies` | HR+ | Get AI-detected anomalies |
| `POST` | `/api/payroll/process` | Admin | Run payroll for a period |
| `GET` | `/api/payroll/:id/history` | Self/HR+ | Pay slip history |
| `GET` | `/api/recruitment/jobs` | Any | List job postings |
| `POST` | `/api/recruitment/jobs` | HR+ | Create job posting |
| `POST` | `/api/recruitment/apply/:jobId` | Any | Submit application |
| `POST` | `/api/recruitment/jobs/:id/screen-all` | HR+ | AI screen all applications |
| `GET` | `/api/analytics/dashboard` | HR+ | Dashboard statistics |
| `GET` | `/api/ai/health` | Any (auth) | AI service status |
| `POST` | `/api/ai/performance/:id/analyze` | HR+ | AI feedback analysis |

---

## AI Features Guide

### Using Resume Screening

1. Log in as HR Recruiter
2. Go to **Recruitment** tab
3. Click **View Apps** on any job
4. Click **AI Screen All** to score all pending applications
5. Or click **Screen** on individual applications

The AI returns:
- Overall score (0–100)
- Recommendation: Strong Yes / Yes / Maybe / No
- Matched and missing skills
- Strengths and concerns

### Using the Interview Bot

Accessed via the AI service API (`/interview/start`). The bot:
1. Greets the candidate and explains the process
2. Asks 5–7 role-relevant questions
3. Follows up based on answers
4. Produces an evaluation report with hire recommendation

### Using Performance Analysis

1. Go to **AI Tools** tab
2. Enter any Employee ID (e.g. `EMP00005`)
3. Click **Analyze**
4. View sentiment score, collaboration rating, and AI insights

### Using Anomaly Detection

Anomalies are detected automatically on every check-in and check-out. View them at:
- **Attendance** tab → AI-Detected Anomalies section
- Filtered by severity (1=Low, 2=Medium, 3=High)
- HR can mark them as resolved

---

## Production Deployment

To switch from SQLite to PostgreSQL for production:

1. Update `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/hrms_db
```

2. Update `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Run migrations:
```bash
npx prisma migrate deploy
```

Use the included `docker-compose.yml` for containerized deployment with PostgreSQL and Redis.

---

## License

MIT © 2025 FWC Inc. Hackathon Team

---

<div align="center">
Built with ❤️ for the FWC Inc. SD-1 AI/ML Hackathon
</div>
