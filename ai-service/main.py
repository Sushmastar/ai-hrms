"""
AI-HRMS FastAPI AI/ML Service
Entry point — registers all routers
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import sys

from config import settings
from routers import resume, interview, performance, attendance, scheduling

# Configure structured logging
logger.remove()
logger.add(sys.stdout, level=settings.LOG_LEVEL, format="{time} | {level} | {message}")
logger.add("logs/ai_service_{time}.log", rotation="10 MB", retention="30 days", level="INFO")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("AI Service starting up...")
    import nltk
    try:
        nltk.download("vader_lexicon", quiet=True)
        nltk.download("punkt", quiet=True)
        nltk.download("stopwords", quiet=True)
    except Exception as e:
        logger.warning(f"NLTK data download warning: {e}")
    logger.info("AI Service ready ✓")
    yield
    logger.info("AI Service shutting down...")


app = FastAPI(
    title="HRMS AI Service",
    description="AI/ML microservice for resume screening, interview bot, performance analytics, and attendance anomaly detection",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://backend:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "ai-hrms", "version": "1.0.0"}


# Register routers
app.include_router(resume.router, prefix="/resume", tags=["Resume Screening"])
app.include_router(interview.router, prefix="/interview", tags=["Interview Bot"])
app.include_router(performance.router, prefix="/performance", tags=["Performance Analytics"])
app.include_router(attendance.router, prefix="/attendance", tags=["Attendance Anomaly"])
app.include_router(scheduling.router, prefix="/scheduling", tags=["Shift Scheduling"])
