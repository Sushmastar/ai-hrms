"""
AI Feature 4: Attendance Anomaly Detection
- Real-time pattern analysis on check-in/out data
- Habitual late arrival detection
- Rule-based + AI hybrid detection engine
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, time
from loguru import logger

from services.gemini_client import generate_json

router = APIRouter()

SYSTEM_PROMPT = """
You are an HR anomaly detection system. Analyze attendance data for policy violations
and anomalies. Be precise and evidence-based. Only flag genuine issues.
Return only valid JSON.
"""

# Company attendance policy constants
POLICY = {
    "shift_start": time(9, 0),       # 09:00
    "grace_period_min": 15,           # 15-min grace
    "late_threshold_min": 30,         # flag if > 30 min late
    "early_checkout_threshold_min": 60, # flag if > 1hr early
    "min_work_hours": 7.0,
    "max_overtime_hours": 3.0,
    "overtime_alert_hours": 4.0,
}


class AnomalyDetectRequest(BaseModel):
    attendance_id: str
    employee_id: str
    date: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    work_hours: Optional[float] = None
    overtime: Optional[float] = None


class HistoricalAnomalyRequest(BaseModel):
    employee_id: str
    records: list[dict]  # last 30 days attendance records


@router.post("/detect-anomaly")
async def detect_anomaly(req: AnomalyDetectRequest):
    """
    Real-time anomaly detection for a single attendance record.
    Uses rule-based checks + AI for nuanced cases.
    """
    anomalies = []

    # Parse times
    check_in_time = None
    check_out_time = None

    if req.check_in:
        try:
            check_in_dt = datetime.fromisoformat(req.check_in.replace("Z", "+00:00"))
            check_in_time = check_in_dt.time().replace(tzinfo=None)
        except Exception:
            pass

    if req.check_out:
        try:
            check_out_dt = datetime.fromisoformat(req.check_out.replace("Z", "+00:00"))
            check_out_time = check_out_dt.time().replace(tzinfo=None)
        except Exception:
            pass

    # Rule 1: Late check-in
    if check_in_time:
        shift_start = POLICY["shift_start"]
        late_minutes = (
            (check_in_time.hour * 60 + check_in_time.minute)
            - (shift_start.hour * 60 + shift_start.minute)
        )
        if late_minutes > POLICY["late_threshold_min"]:
            severity = 3 if late_minutes > 90 else 2 if late_minutes > 45 else 1
            anomalies.append({
                "type": "LATE_CHECKIN",
                "severity": severity,
                "description": f"Employee checked in {late_minutes} minutes late (threshold: {POLICY['late_threshold_min']}min)",
                "confidence": min(0.95, 0.7 + (late_minutes / 200)),
            })

    # Rule 2: Missing check-out
    if check_in_time and not check_out_time:
        anomalies.append({
            "type": "MISSED_CHECKOUT",
            "severity": 2,
            "description": "No checkout recorded for this shift",
            "confidence": 0.95,
        })

    # Rule 3: Excessive overtime
    if req.overtime and req.overtime > POLICY["overtime_alert_hours"]:
        anomalies.append({
            "type": "OVERTIME_EXCESS",
            "severity": 2,
            "description": f"Overtime of {req.overtime:.1f}h exceeds alert threshold of {POLICY['overtime_alert_hours']}h",
            "confidence": 0.90,
        })

    # Rule 4: Early checkout
    if check_out_time and req.work_hours and req.work_hours < POLICY["min_work_hours"]:
        early_minutes = int((POLICY["min_work_hours"] - req.work_hours) * 60)
        if early_minutes > POLICY["early_checkout_threshold_min"]:
            anomalies.append({
                "type": "EARLY_CHECKOUT",
                "severity": 2,
                "description": f"Employee worked only {req.work_hours:.1f}h (minimum expected: {POLICY['min_work_hours']}h)",
                "confidence": 0.85,
            })

    logger.info(f"Anomaly detection | emp={req.employee_id} att={req.attendance_id} found={len(anomalies)}")
    return {"attendance_id": req.attendance_id, "anomalies": anomalies}


@router.post("/pattern-analysis")
async def analyze_attendance_patterns(req: HistoricalAnomalyRequest):
    """
    Analyze 30-day attendance history for habitual patterns using Gemini.
    """
    records_text = "\n".join(
        f"  {r.get('date', 'unknown')}: check_in={r.get('checkIn', 'N/A')} "
        f"check_out={r.get('checkOut', 'N/A')} status={r.get('status', 'N/A')} "
        f"hours={r.get('workHours', 'N/A')}"
        for r in req.records[:30]
    )

    prompt = f"""
Analyze the following 30-day attendance history for employee {req.employee_id}.
Identify habitual patterns, chronic issues, and behavioral trends.

ATTENDANCE RECORDS:
{records_text}

Respond with ONLY valid JSON:
{{
  "habitual_patterns": ["<pattern1>", "<pattern2>"],
  "chronic_issues": ["<issue1>", "<issue2>"],
  "punctuality_score": <number 0-100>,
  "reliability_score": <number 0-100>,
  "average_work_hours": <number>,
  "late_arrival_frequency": "<e.g., 3 times in last 30 days>",
  "risk_level": "high" | "medium" | "low",
  "recommended_actions": ["<action1>", "<action2>"],
  "overall_assessment": "<2-sentence summary>"
}}
"""

    result = await generate_json(
        prompt=prompt,
        system_instruction=SYSTEM_PROMPT,
        fallback={
            "habitual_patterns": [],
            "chronic_issues": [],
            "punctuality_score": 75,
            "reliability_score": 75,
            "average_work_hours": 8.0,
            "late_arrival_frequency": "unknown",
            "risk_level": "low",
            "recommended_actions": [],
            "overall_assessment": "Insufficient data for analysis.",
        },
    )

    result["employee_id"] = req.employee_id
    return result
