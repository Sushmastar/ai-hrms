"""
AI Feature 4b: AI Shift Schedule Generation
- Optimized shift scheduling based on team size, leaves, and constraints
- Uses Gemini to generate balanced weekly schedules
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from loguru import logger

from services.gemini_client import generate_json

router = APIRouter()

SYSTEM_PROMPT = """
You are an expert workforce management system that creates optimal shift schedules.
Consider employee availability, leave approvals, workload balance, and business requirements.
Return only valid JSON as specified.
"""


class EmployeeInfo(BaseModel):
    id: str
    firstName: str
    lastName: str


class LeaveInfo(BaseModel):
    employeeId: str
    startDate: str
    endDate: str


class ScheduleRequest(BaseModel):
    employees: list[EmployeeInfo]
    leaves: list[LeaveInfo] = []
    week_start: str  # YYYY-MM-DD
    constraints: dict = {}  # e.g., {"min_coverage": 5, "shift_hours": 8}


@router.post("/generate")
async def generate_schedule(req: ScheduleRequest):
    """Generate an optimized weekly shift schedule."""

    on_leave_ids = {l.employeeId for l in req.leaves}
    available_employees = [e for e in req.employees if e.id not in on_leave_ids]

    emp_list = "\n".join(
        f"  - {e.firstName} {e.lastName} (ID: {e.id})"
        for e in available_employees[:50]  # cap for prompt size
    )

    constraints_text = "\n".join(f"  - {k}: {v}" for k, v in req.constraints.items()) or "  - Standard 8-hour shifts, 5 days a week"

    prompt = f"""
Generate an optimal weekly shift schedule for the week starting {req.week_start}.

AVAILABLE EMPLOYEES ({len(available_employees)} total):
{emp_list}

EMPLOYEES ON LEAVE: {len(on_leave_ids)}

SCHEDULING CONSTRAINTS:
{constraints_text}

Create a fair, balanced schedule. Return ONLY valid JSON in this format:
{{
  "week_start": "{req.week_start}",
  "schedule": {{
    "Monday": [
      {{"employee_id": "<id>", "shift": "09:00-17:00", "type": "MORNING"}},
      {{"employee_id": "<id>", "shift": "14:00-22:00", "type": "EVENING"}}
    ],
    "Tuesday": [],
    "Wednesday": [],
    "Thursday": [],
    "Friday": []
  }},
  "coverage_summary": {{
    "Monday": {{"count": <n>, "adequate": true}},
    "Tuesday": {{"count": <n>, "adequate": true}},
    "Wednesday": {{"count": <n>, "adequate": true}},
    "Thursday": {{"count": <n>, "adequate": true}},
    "Friday": {{"count": <n>, "adequate": true}}
  }},
  "optimization_notes": ["<note1>", "<note2>"],
  "employees_scheduled": <number>,
  "employees_on_leave": {len(on_leave_ids)}
}}
"""

    result = await generate_json(
        prompt=prompt,
        system_instruction=SYSTEM_PROMPT,
        fallback={
            "week_start": req.week_start,
            "schedule": {"Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": []},
            "coverage_summary": {},
            "optimization_notes": ["Schedule generation failed — please create manually"],
            "employees_scheduled": 0,
            "employees_on_leave": len(on_leave_ids),
        },
    )

    logger.info(f"Schedule generated | week={req.week_start} employees={len(available_employees)}")
    return result
