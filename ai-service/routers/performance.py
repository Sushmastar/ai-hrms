"""
AI Feature 3: AI Performance Analytics
- Predictive analytics on employee performance
- Sentiment analysis on peer feedback
- Growth trend forecasting
- Anomaly detection for sudden drops
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from loguru import logger

from services.gemini_client import generate_json

router = APIRouter()

SYSTEM_PROMPT = """
You are a specialized HR analytics AI and organizational psychologist.
Your role is to analyze employee performance data, identify patterns, and provide
data-driven insights and predictions. Always be constructive and evidence-based.
Return only valid JSON.
"""


class ReviewEntry(BaseModel):
    period: str
    score: float
    rating: str
    sentiment: float = 0.0


class KPIEntry(BaseModel):
    metric: str
    value: float
    target: float
    period: str


class PredictRequest(BaseModel):
    employee_id: str
    reviews: list[ReviewEntry] = []
    kpis: list[KPIEntry] = []


class AnalyzeRequest(BaseModel):
    employee_id: str
    review_period: str
    peer_feedback: str


@router.post("/predict")
async def predict_performance(req: PredictRequest):
    """
    Predict next-quarter performance based on historical data.
    Returns trend analysis, predicted score, and growth trajectory.
    """

    reviews_summary = "\n".join(
        f"  {r.period}: score={r.score}, rating={r.rating}, sentiment={r.sentiment:.2f}"
        for r in req.reviews
    ) or "  No historical reviews available"

    kpis_summary = "\n".join(
        f"  {k.period} | {k.metric}: {k.value}/{k.target} ({(k.value/k.target*100):.1f}%)"
        for k in req.kpis
    ) or "  No KPI data available"

    # Basic trend calculation
    if len(req.reviews) >= 2:
        scores = [r.score for r in req.reviews]
        trend_direction = "improving" if scores[-1] > scores[0] else "declining" if scores[-1] < scores[0] else "stable"
        avg_score = sum(scores) / len(scores)
        recent_avg = sum(scores[-3:]) / min(3, len(scores))
    else:
        trend_direction = "insufficient data"
        avg_score = req.reviews[0].score if req.reviews else 60.0
        recent_avg = avg_score

    prompt = f"""
Analyze the following employee performance data and provide predictions.

EMPLOYEE ID: {req.employee_id}

PERFORMANCE REVIEW HISTORY:
{reviews_summary}

KPI ACHIEVEMENT HISTORY:
{kpis_summary}

Calculated metrics:
- Average score: {avg_score:.1f}
- Recent average (last 3): {recent_avg:.1f}
- Overall trend: {trend_direction}

Provide a comprehensive performance prediction in this exact JSON format:
{{
  "predicted_next_score": <number 0-100>,
  "trend_direction": "improving" | "declining" | "stable" | "volatile",
  "trend_strength": "strong" | "moderate" | "weak",
  "risk_level": "high" | "medium" | "low",
  "growth_trajectory": "<short description>",
  "key_drivers": ["<driver1>", "<driver2>", "<driver3>"],
  "risk_factors": ["<risk1>", "<risk2>"],
  "recommended_actions": ["<action1>", "<action2>", "<action3>"],
  "promotion_readiness": <number 0-100>,
  "flight_risk_score": <number 0-100>,
  "summary": "<2-3 sentence executive summary>",
  "confidence": <number 0-1>
}}
"""

    result = await generate_json(
        prompt=prompt,
        system_instruction=SYSTEM_PROMPT,
        fallback={
            "predicted_next_score": recent_avg,
            "trend_direction": trend_direction,
            "trend_strength": "moderate",
            "risk_level": "medium",
            "growth_trajectory": "Insufficient data for reliable prediction",
            "key_drivers": [],
            "risk_factors": [],
            "recommended_actions": ["Continue monitoring performance data"],
            "promotion_readiness": 50.0,
            "flight_risk_score": 30.0,
            "summary": "Prediction unavailable — insufficient historical data.",
            "confidence": 0.3,
        },
    )

    result["employee_id"] = req.employee_id
    result["data_points_used"] = len(req.reviews) + len(req.kpis)
    logger.info(f"Performance predicted | emp={req.employee_id} predicted={result.get('predicted_next_score')}")
    return result


@router.post("/analyze")
async def analyze_feedback(req: AnalyzeRequest):
    """
    Analyze peer review feedback using NLP + Gemini.
    Returns sentiment score, themes, and AI-generated insights.
    """
    # NLTK VADER sentiment as a fast baseline
    try:
        from nltk.sentiment.vader import SentimentIntensityAnalyzer
        sid = SentimentIntensityAnalyzer()
        vader_scores = sid.polarity_scores(req.peer_feedback)
        baseline_sentiment = vader_scores["compound"]
    except Exception:
        baseline_sentiment = 0.0

    prompt = f"""
Analyze the following peer review feedback for an employee.

EMPLOYEE ID: {req.employee_id}
REVIEW PERIOD: {req.review_period}

PEER FEEDBACK TEXT:
"{req.peer_feedback}"

Baseline sentiment score (VADER): {baseline_sentiment:.4f}

Provide detailed analysis in this exact JSON format:
{{
  "sentiment_score": <number -1.0 to 1.0>,
  "sentiment_label": "very_positive" | "positive" | "neutral" | "negative" | "very_negative",
  "key_themes": ["<theme1>", "<theme2>", "<theme3>"],
  "positive_aspects": ["<aspect1>", "<aspect2>"],
  "improvement_areas": ["<area1>", "<area2>"],
  "collaboration_score": <number 0-100>,
  "leadership_indicators": ["<indicator1>", "<indicator2>"],
  "communication_assessment": "<brief assessment>",
  "ai_insights": "<2-3 sentence professional analysis>",
  "action_items": ["<item1>", "<item2>"]
}}
"""

    result = await generate_json(
        prompt=prompt,
        system_instruction=SYSTEM_PROMPT,
        fallback={
            "sentiment_score": baseline_sentiment,
            "sentiment_label": "neutral",
            "key_themes": [],
            "positive_aspects": [],
            "improvement_areas": [],
            "collaboration_score": 60,
            "leadership_indicators": [],
            "communication_assessment": "Unable to analyze",
            "ai_insights": "Manual review recommended.",
            "action_items": [],
        },
    )

    result["employee_id"] = req.employee_id
    result["review_period"] = req.review_period
    return result
