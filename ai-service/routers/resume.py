"""
AI Feature 1: Autonomous Resume Screening
- Parse PDF resumes
- Rank and score against job description using Gemini
- Batch processing support
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, EmailStr
from typing import Optional
from loguru import logger

from services.gemini_client import generate_json
from services.pdf_extractor import extract_text_from_bytes, detect_sections, extract_years_of_experience

router = APIRouter()

SYSTEM_PROMPT = """
You are an expert HR recruiter and talent assessment specialist with 15+ years of experience.
Your task is to evaluate resumes against job descriptions with precision, fairness, and detail.
Always respond with valid JSON only. No markdown, no extra text.
"""


class ScreenRequest(BaseModel):
    application_id: str
    resume_url: Optional[str] = None
    resume_text: Optional[str] = None
    job_title: str
    job_description: str
    job_requirements: list[str] = []
    job_skills: list[str] = []


class BatchScreenRequest(BaseModel):
    job_id: str
    job_title: str
    job_description: str
    job_requirements: list[str] = []
    job_skills: list[str] = []
    application_ids: list[str] = []


@router.post("/screen")
async def screen_resume(req: ScreenRequest):
    """
    Screen a single resume against a job description.
    Returns score (0-100), ranked skills match, gaps, and recommendation.
    """
    resume_text = req.resume_text

    if not resume_text and req.resume_url:
        try:
            resume_text = await _fetch_resume_text(req.resume_url)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch resume: {e}")

    if not resume_text:
        raise HTTPException(status_code=400, detail="No resume content provided")

    result = await _evaluate_resume(
        resume_text=resume_text,
        job_title=req.job_title,
        job_description=req.job_description,
        job_requirements=req.job_requirements,
        job_skills=req.job_skills,
        application_id=req.application_id,
    )

    return result


@router.post("/upload-and-screen")
async def upload_and_screen(
    file: UploadFile = File(...),
    job_title: str = Form(...),
    job_description: str = Form(...),
    application_id: str = Form(...),
):
    """Accept PDF upload directly and screen it."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    pdf_bytes = await file.read()
    resume_text = extract_text_from_bytes(pdf_bytes)

    result = await _evaluate_resume(
        resume_text=resume_text,
        job_title=job_title,
        job_description=job_description,
        application_id=application_id,
    )
    return result


@router.post("/screen-batch")
async def screen_batch(req: BatchScreenRequest):
    """
    Batch-screen multiple resumes for a job.
    Returns ranked list with scores for each application_id.
    Uses placeholder scoring since batch resumeText must be fetched per app.
    In production: fetch resumes from MinIO/DB by application_id.
    """
    # In a real implementation, fetch resume texts from DB/MinIO for each application_id
    # For this blueprint, we return the structure:
    results = []
    for i, app_id in enumerate(req.application_ids):
        # Simulate varied scores (replace with real fetch + evaluate logic)
        import random
        score = round(random.uniform(45, 95), 1)
        results.append({
            "application_id": app_id,
            "score": score,
            "recommendation": _score_to_recommendation(score),
            "rank": i + 1,
        })

    # Sort by score descending and re-rank
    results.sort(key=lambda x: x["score"], reverse=True)
    for i, r in enumerate(results):
        r["rank"] = i + 1

    return {"job_id": req.job_id, "results": results, "total": len(results)}


async def _evaluate_resume(
    resume_text: str,
    job_title: str,
    job_description: str,
    application_id: str,
    job_requirements: list[str] = [],
    job_skills: list[str] = [],
) -> dict:
    """Core evaluation logic using Gemini."""

    sections = detect_sections(resume_text)
    years_exp = extract_years_of_experience(resume_text)

    prompt = f"""
Evaluate the following resume against the job description. Be objective and thorough.

JOB TITLE: {job_title}

JOB DESCRIPTION:
{job_description[:2000]}

REQUIRED SKILLS: {', '.join(job_skills) if job_skills else 'Not specified'}

REQUIREMENTS: {', '.join(job_requirements) if job_requirements else 'Not specified'}

RESUME TEXT:
{resume_text[:3000]}

Respond with ONLY a valid JSON object with this exact structure:
{{
  "score": <number 0-100>,
  "recommendation": "STRONG_YES" | "YES" | "MAYBE" | "NO",
  "summary": "<2-3 sentence assessment>",
  "matched_skills": ["<skill1>", "<skill2>"],
  "missing_skills": ["<skill1>", "<skill2>"],
  "skill_match_percent": <number 0-100>,
  "experience_years": <number or null>,
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "concerns": ["<concern1>", "<concern2>"],
  "cultural_fit_score": <number 0-100>,
  "technical_score": <number 0-100>,
  "communication_score": <number 0-100>
}}
"""

    result = await generate_json(
        prompt=prompt,
        system_instruction=SYSTEM_PROMPT,
        fallback={
            "score": 50.0,
            "recommendation": "MAYBE",
            "summary": "Unable to evaluate — please review manually.",
            "matched_skills": [],
            "missing_skills": [],
            "skill_match_percent": 50,
            "experience_years": years_exp,
            "strengths": [],
            "concerns": ["AI evaluation failed — manual review required"],
            "cultural_fit_score": 50,
            "technical_score": 50,
            "communication_score": 50,
        },
    )

    result["application_id"] = application_id
    if result.get("experience_years") is None:
        result["experience_years"] = years_exp
    result["sections_detected"] = list(sections.keys())

    logger.info(f"Resume screened | app={application_id} score={result.get('score')} rec={result.get('recommendation')}")
    return result


async def _fetch_resume_text(resume_url: str) -> str:
    """
    Fetch resume bytes from MinIO and extract text.
    resume_url is an object key like 'resumes/uuid-filename.pdf'
    """
    from minio import Minio
    from config import settings
    import io

    client = Minio(
        f"{settings.MINIO_ENDPOINT}:{settings.MINIO_PORT}",
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=False,
    )

    response = client.get_object(settings.MINIO_BUCKET_RESUMES, resume_url)
    pdf_bytes = response.read()
    response.close()

    return extract_text_from_bytes(pdf_bytes)


def _score_to_recommendation(score: float) -> str:
    if score >= 80:
        return "STRONG_YES"
    if score >= 65:
        return "YES"
    if score >= 50:
        return "MAYBE"
    return "NO"
