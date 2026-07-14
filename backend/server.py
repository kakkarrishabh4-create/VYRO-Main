from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.encoders import jsonable_encoder
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict
import uuid
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------------- Legacy status models ----------------
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.dict())
    await db.status_checks.insert_one(status_obj.dict())
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    return [StatusCheck(**s) for s in status_checks]


# ---------------- VYRO — Types ----------------
Sex = Literal["male", "female"]
WeightUnit = Literal["kg", "lb"]
Goal = Literal["fat_loss", "muscle_gain", "recomposition", "general", "endurance"]
JobActivity = Literal["desk", "active", "manual"]
Stress = Literal["low", "moderate", "high"]
Experience = Literal["beginner", "intermediate", "advanced"]
Equipment = Literal["home", "gym", "none"]
SessionStatus = Literal["workout", "rest", "missed"]


class ProfileTargets(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    bmr: int
    tdee: int


class ProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    age: int = Field(ge=13, le=100)
    sex: Sex
    height_cm: float = Field(gt=80, lt=260)
    weight: float = Field(gt=20, lt=500)
    weight_unit: WeightUnit
    goal: Goal
    job_activity: JobActivity
    sleep_hours: int = Field(ge=3, le=12)
    stress: Stress
    training_days: int = Field(ge=1, le=7)
    experience: Experience
    injuries: str = Field(default="", max_length=500)
    equipment: Equipment
    targets: ProfileTargets


class Profile(ProfileCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_id: str
    date: str
    status: SessionStatus
    workout_name: Optional[str] = None
    duration_min: Optional[int] = None


# ---------------- VYRO — Workout templates ----------------
WORKOUT_TEMPLATES: dict = {
    "fat_loss": [
        {"name": "Conditioning · Full body", "exercises": 6, "duration_min": 45},
        {"name": "Intervals · Lower", "exercises": 5, "duration_min": 40},
        {"name": "Circuit · Upper", "exercises": 6, "duration_min": 45},
    ],
    "muscle_gain": [
        {"name": "Push · Chest & Shoulders", "exercises": 6, "duration_min": 60},
        {"name": "Pull · Back & Biceps", "exercises": 6, "duration_min": 60},
        {"name": "Legs · Quad focus", "exercises": 5, "duration_min": 65},
    ],
    "recomposition": [
        {"name": "Upper · Hypertrophy", "exercises": 6, "duration_min": 55},
        {"name": "Lower · Strength", "exercises": 5, "duration_min": 55},
        {"name": "Full body · Recomp", "exercises": 7, "duration_min": 60},
    ],
    "general": [
        {"name": "Full body · Balanced", "exercises": 6, "duration_min": 45},
        {"name": "Movement · Mobility", "exercises": 5, "duration_min": 40},
        {"name": "Strength · Foundations", "exercises": 5, "duration_min": 50},
    ],
    "endurance": [
        {"name": "Threshold · Run", "exercises": 4, "duration_min": 55},
        {"name": "Strength · Support", "exercises": 5, "duration_min": 45},
        {"name": "Long · Aerobic base", "exercises": 3, "duration_min": 75},
    ],
}


# Exercise lists per workout name. Ordered as they'll be performed.
# reps stored as string so ranges ("8-10") and time ("30s") both work.
WORKOUT_EXERCISES: dict = {
    # ---- Fat loss ----
    "Conditioning · Full body": [
        {"name": "Goblet Squat", "target_sets": 3, "target_reps": "12", "rest_seconds": 60, "starter_weight": 20},
        {"name": "Push-up", "target_sets": 3, "target_reps": "12", "rest_seconds": 60, "starter_weight": 0},
        {"name": "Kettlebell Swing", "target_sets": 3, "target_reps": "15", "rest_seconds": 60, "starter_weight": 24},
        {"name": "Row (Dumbbell)", "target_sets": 3, "target_reps": "10", "rest_seconds": 60, "starter_weight": 22},
        {"name": "Plank", "target_sets": 3, "target_reps": "45s", "rest_seconds": 45, "starter_weight": 0},
        {"name": "Farmer Carry", "target_sets": 3, "target_reps": "30m", "rest_seconds": 60, "starter_weight": 24},
    ],
    "Intervals · Lower": [
        {"name": "Air Bike Sprint", "target_sets": 5, "target_reps": "30s", "rest_seconds": 60, "starter_weight": 0},
        {"name": "Goblet Squat", "target_sets": 3, "target_reps": "15", "rest_seconds": 60, "starter_weight": 20},
        {"name": "Reverse Lunge", "target_sets": 3, "target_reps": "10", "rest_seconds": 60, "starter_weight": 16},
        {"name": "Glute Bridge", "target_sets": 3, "target_reps": "15", "rest_seconds": 45, "starter_weight": 40},
        {"name": "Calf Raise", "target_sets": 3, "target_reps": "20", "rest_seconds": 45, "starter_weight": 20},
    ],
    "Circuit · Upper": [
        {"name": "Push-up", "target_sets": 4, "target_reps": "10-12", "rest_seconds": 45, "starter_weight": 0},
        {"name": "Dumbbell Row", "target_sets": 4, "target_reps": "10", "rest_seconds": 60, "starter_weight": 22},
        {"name": "Overhead Press", "target_sets": 3, "target_reps": "10", "rest_seconds": 60, "starter_weight": 30},
        {"name": "Face Pull", "target_sets": 3, "target_reps": "15", "rest_seconds": 45, "starter_weight": 15},
        {"name": "Biceps Curl", "target_sets": 3, "target_reps": "12", "rest_seconds": 45, "starter_weight": 12},
        {"name": "Triceps Rope", "target_sets": 3, "target_reps": "12", "rest_seconds": 45, "starter_weight": 18},
    ],
    # ---- Muscle gain ----
    "Push · Chest & Shoulders": [
        {"name": "Barbell Bench Press", "target_sets": 4, "target_reps": "6-8", "rest_seconds": 150, "starter_weight": 60},
        {"name": "Incline Dumbbell Press", "target_sets": 3, "target_reps": "8-10", "rest_seconds": 120, "starter_weight": 24},
        {"name": "Overhead Press", "target_sets": 3, "target_reps": "8", "rest_seconds": 120, "starter_weight": 35},
        {"name": "Lateral Raise", "target_sets": 3, "target_reps": "12", "rest_seconds": 60, "starter_weight": 8},
        {"name": "Cable Fly", "target_sets": 3, "target_reps": "12", "rest_seconds": 60, "starter_weight": 15},
        {"name": "Triceps Pushdown", "target_sets": 3, "target_reps": "12", "rest_seconds": 60, "starter_weight": 22},
    ],
    "Pull · Back & Biceps": [
        {"name": "Deadlift", "target_sets": 4, "target_reps": "5", "rest_seconds": 180, "starter_weight": 100},
        {"name": "Pull-up", "target_sets": 4, "target_reps": "6-8", "rest_seconds": 120, "starter_weight": 0},
        {"name": "Barbell Row", "target_sets": 3, "target_reps": "8", "rest_seconds": 120, "starter_weight": 60},
        {"name": "Face Pull", "target_sets": 3, "target_reps": "12", "rest_seconds": 60, "starter_weight": 15},
        {"name": "Barbell Curl", "target_sets": 3, "target_reps": "10", "rest_seconds": 60, "starter_weight": 25},
        {"name": "Hammer Curl", "target_sets": 3, "target_reps": "12", "rest_seconds": 45, "starter_weight": 12},
    ],
    "Legs · Quad focus": [
        {"name": "Back Squat", "target_sets": 4, "target_reps": "6-8", "rest_seconds": 180, "starter_weight": 80},
        {"name": "Front Squat", "target_sets": 3, "target_reps": "8", "rest_seconds": 150, "starter_weight": 50},
        {"name": "Bulgarian Split Squat", "target_sets": 3, "target_reps": "10", "rest_seconds": 90, "starter_weight": 16},
        {"name": "Leg Extension", "target_sets": 3, "target_reps": "12", "rest_seconds": 60, "starter_weight": 40},
        {"name": "Standing Calf Raise", "target_sets": 3, "target_reps": "15", "rest_seconds": 45, "starter_weight": 60},
    ],
    # ---- Recomposition ----
    "Upper · Hypertrophy": [
        {"name": "Incline Dumbbell Press", "target_sets": 4, "target_reps": "8-10", "rest_seconds": 120, "starter_weight": 24},
        {"name": "Pull-up", "target_sets": 4, "target_reps": "8", "rest_seconds": 120, "starter_weight": 0},
        {"name": "Dumbbell Shoulder Press", "target_sets": 3, "target_reps": "10", "rest_seconds": 90, "starter_weight": 20},
        {"name": "Chest Fly", "target_sets": 3, "target_reps": "12", "rest_seconds": 60, "starter_weight": 14},
        {"name": "Barbell Curl", "target_sets": 3, "target_reps": "10", "rest_seconds": 60, "starter_weight": 25},
        {"name": "Skullcrusher", "target_sets": 3, "target_reps": "10", "rest_seconds": 60, "starter_weight": 25},
    ],
    "Lower · Strength": [
        {"name": "Back Squat", "target_sets": 5, "target_reps": "5", "rest_seconds": 180, "starter_weight": 80},
        {"name": "Romanian Deadlift", "target_sets": 3, "target_reps": "8", "rest_seconds": 120, "starter_weight": 60},
        {"name": "Walking Lunge", "target_sets": 3, "target_reps": "10", "rest_seconds": 90, "starter_weight": 20},
        {"name": "Leg Curl", "target_sets": 3, "target_reps": "12", "rest_seconds": 60, "starter_weight": 30},
        {"name": "Calf Raise", "target_sets": 3, "target_reps": "15", "rest_seconds": 45, "starter_weight": 40},
    ],
    "Full body · Recomp": [
        {"name": "Trap Bar Deadlift", "target_sets": 3, "target_reps": "6", "rest_seconds": 150, "starter_weight": 90},
        {"name": "Bench Press", "target_sets": 3, "target_reps": "8", "rest_seconds": 120, "starter_weight": 55},
        {"name": "Front Squat", "target_sets": 3, "target_reps": "8", "rest_seconds": 120, "starter_weight": 45},
        {"name": "Barbell Row", "target_sets": 3, "target_reps": "10", "rest_seconds": 90, "starter_weight": 50},
        {"name": "Dumbbell Curl", "target_sets": 3, "target_reps": "10", "rest_seconds": 45, "starter_weight": 12},
        {"name": "Triceps Extension", "target_sets": 3, "target_reps": "10", "rest_seconds": 45, "starter_weight": 20},
        {"name": "Plank", "target_sets": 3, "target_reps": "60s", "rest_seconds": 45, "starter_weight": 0},
    ],
    # ---- General ----
    "Full body · Balanced": [
        {"name": "Goblet Squat", "target_sets": 3, "target_reps": "10", "rest_seconds": 60, "starter_weight": 20},
        {"name": "Push-up", "target_sets": 3, "target_reps": "10", "rest_seconds": 60, "starter_weight": 0},
        {"name": "Dumbbell Row", "target_sets": 3, "target_reps": "10", "rest_seconds": 60, "starter_weight": 20},
        {"name": "Overhead Press", "target_sets": 3, "target_reps": "8", "rest_seconds": 60, "starter_weight": 25},
        {"name": "Hip Hinge", "target_sets": 3, "target_reps": "10", "rest_seconds": 60, "starter_weight": 30},
        {"name": "Dead Bug", "target_sets": 3, "target_reps": "8", "rest_seconds": 45, "starter_weight": 0},
    ],
    "Movement · Mobility": [
        {"name": "World's Greatest Stretch", "target_sets": 3, "target_reps": "5", "rest_seconds": 30, "starter_weight": 0},
        {"name": "Cossack Squat", "target_sets": 3, "target_reps": "8", "rest_seconds": 45, "starter_weight": 0},
        {"name": "Cat-Cow", "target_sets": 3, "target_reps": "10", "rest_seconds": 30, "starter_weight": 0},
        {"name": "Bird Dog", "target_sets": 3, "target_reps": "10", "rest_seconds": 30, "starter_weight": 0},
        {"name": "Hip 90/90", "target_sets": 3, "target_reps": "8", "rest_seconds": 30, "starter_weight": 0},
    ],
    "Strength · Foundations": [
        {"name": "Back Squat", "target_sets": 3, "target_reps": "5", "rest_seconds": 150, "starter_weight": 60},
        {"name": "Bench Press", "target_sets": 3, "target_reps": "5", "rest_seconds": 150, "starter_weight": 50},
        {"name": "Deadlift", "target_sets": 1, "target_reps": "5", "rest_seconds": 180, "starter_weight": 80},
        {"name": "Overhead Press", "target_sets": 3, "target_reps": "5", "rest_seconds": 120, "starter_weight": 30},
        {"name": "Barbell Row", "target_sets": 3, "target_reps": "5", "rest_seconds": 120, "starter_weight": 40},
    ],
    # ---- Endurance ----
    "Threshold · Run": [
        {"name": "Warm-up Jog", "target_sets": 1, "target_reps": "10m", "rest_seconds": 60, "starter_weight": 0},
        {"name": "Threshold Intervals", "target_sets": 4, "target_reps": "5m", "rest_seconds": 120, "starter_weight": 0},
        {"name": "Cool-down Jog", "target_sets": 1, "target_reps": "10m", "rest_seconds": 0, "starter_weight": 0},
        {"name": "Static Stretch", "target_sets": 1, "target_reps": "5m", "rest_seconds": 0, "starter_weight": 0},
    ],
    "Strength · Support": [
        {"name": "Trap Bar Deadlift", "target_sets": 3, "target_reps": "6", "rest_seconds": 120, "starter_weight": 80},
        {"name": "Bulgarian Split Squat", "target_sets": 3, "target_reps": "10", "rest_seconds": 90, "starter_weight": 16},
        {"name": "Push-up", "target_sets": 3, "target_reps": "10", "rest_seconds": 60, "starter_weight": 0},
        {"name": "Single-leg RDL", "target_sets": 3, "target_reps": "8", "rest_seconds": 60, "starter_weight": 14},
        {"name": "Plank", "target_sets": 3, "target_reps": "60s", "rest_seconds": 45, "starter_weight": 0},
    ],
    "Long · Aerobic base": [
        {"name": "Steady Run", "target_sets": 1, "target_reps": "45m", "rest_seconds": 0, "starter_weight": 0},
        {"name": "Mobility Flow", "target_sets": 1, "target_reps": "10m", "rest_seconds": 0, "starter_weight": 0},
        {"name": "Foam Roll", "target_sets": 1, "target_reps": "5m", "rest_seconds": 0, "starter_weight": 0},
    ],
}


def _pick_workout_for(profile: Profile, day_offset: int = 0) -> dict:
    pool = WORKOUT_TEMPLATES[profile.goal]
    seed = hash(f"{profile.id}:{day_offset}") % len(pool)
    return pool[seed]


def _experience_scale(exp: Experience) -> float:
    return {"beginner": 0.7, "intermediate": 1.0, "advanced": 1.25}[exp]


def _convert_weight(kg: float, unit: WeightUnit) -> float:
    return round(kg if unit == "kg" else kg * 2.20462, 1)


# ---------------- AI workout generation ----------------
# Broad-strokes safety net: if a client's `injuries` string mentions any of
# these keywords, we STRIP the matching exercise names from the pool BEFORE
# the model sees it. This is the belt to the model instruction's suspenders —
# even a rogue LLM response can't reintroduce a filtered movement because the
# post-validation allowlist is derived from the same filtered universe.
INJURY_EXCLUSIONS: Dict[str, List[str]] = {
    "shoulder": [
        "Overhead Press", "Dumbbell Shoulder Press", "Lateral Raise",
        "Face Pull", "Handstand",
    ],
    "knee": [
        "Back Squat", "Front Squat", "Goblet Squat", "Bulgarian Split Squat",
        "Reverse Lunge", "Walking Lunge", "Leg Extension", "Leg Curl",
        "Cossack Squat", "Sprint", "Threshold Intervals", "Steady Run",
    ],
    "back": [
        "Deadlift", "Trap Bar Deadlift", "Romanian Deadlift",
        "Single-leg RDL", "Barbell Row", "Bent-over",
    ],
    "lower back": [
        "Deadlift", "Trap Bar Deadlift", "Romanian Deadlift",
        "Single-leg RDL", "Barbell Row", "Bent-over", "Back Squat",
    ],
    "elbow": [
        "Skullcrusher", "Triceps Rope", "Triceps Pushdown", "Biceps Curl",
        "Barbell Curl", "Hammer Curl", "Dumbbell Curl", "Triceps Extension",
    ],
    "wrist": [
        "Front Squat", "Barbell Curl", "Push-up", "Skullcrusher",
        "Barbell Bench Press",
    ],
    "hip": ["Bulgarian Split Squat", "Cossack Squat", "Walking Lunge"],
    "ankle": [
        "Sprint", "Threshold Intervals", "Steady Run", "Standing Calf Raise",
        "Calf Raise", "Walking Lunge",
    ],
    "neck": ["Overhead Press", "Dumbbell Shoulder Press", "Face Pull"],
}


def _pool_after_injuries(injuries: str) -> Dict[str, List[dict]]:
    """
    Group WORKOUT_EXERCISES by category, dropping any exercise whose name
    matches an injury keyword substring (case-insensitive). Categories with
    fewer than 3 remaining exercises are dropped entirely so the model never
    tries to build a session out of a thin pool.
    """
    injuries_l = (injuries or "").lower()
    blocked: set = set()
    for keyword, names in INJURY_EXCLUSIONS.items():
        if keyword in injuries_l:
            for n in names:
                blocked.add(n.lower())

    grouped: Dict[str, List[dict]] = {}
    for category, exercises in WORKOUT_EXERCISES.items():
        allowed = [
            ex for ex in exercises
            if not any(b in ex["name"].lower() for b in blocked)
        ]
        if len(allowed) >= 3:
            grouped[category] = allowed
    return grouped


def _validate_generated_workout(plan: dict, allowed_names: set,
                                 allowed_categories: set) -> bool:
    """
    Strict schema + allowlist check. Runs BEFORE we save the plan or hand it
    to the client. Any failure = fall back to the template so a broken AI
    response can never surface.
    """
    if not isinstance(plan, dict):
        return False
    name = plan.get("name")
    duration = plan.get("duration_min")
    exercises = plan.get("exercises")
    if not isinstance(name, str) or not name.strip():
        return False
    if name not in allowed_categories:
        return False
    if not isinstance(duration, int) or duration < 10 or duration > 180:
        return False
    if not isinstance(exercises, list) or len(exercises) == 0 or len(exercises) > 15:
        return False

    for ex in exercises:
        if not isinstance(ex, dict):
            return False
        if ex.get("name") not in allowed_names:
            return False
        ts = ex.get("target_sets")
        if not isinstance(ts, int) or ts < 1 or ts > 6:
            return False
        tr = ex.get("target_reps")
        if not isinstance(tr, str) or not tr.strip():
            return False
        rs = ex.get("rest_seconds")
        if not isinstance(rs, int) or rs < 0 or rs > 300:
            return False
        sw = ex.get("starter_weight")
        if not isinstance(sw, (int, float)) or sw < 0:
            return False
    return True


def _format_recent_logs(logs: List["LoggedWorkout"]) -> str:
    """Compact, model-friendly recap of the client's last few sessions."""
    if not logs:
        return "(no recent logs — this is their first tracked session)"
    lines: List[str] = []
    for lw in logs[:3]:
        header = f"- {lw.workout_name} ({lw.date}, {lw.weight_unit}):"
        lines.append(header)
        for ex in lw.exercises[:6]:
            set_bits = []
            for s in ex.sets:
                bit = f"{s.weight}×{s.reps}"
                if s.rpe:
                    bit += f"@RPE{s.rpe}"
                set_bits.append(bit)
            lines.append(f"    · {ex.name}: {', '.join(set_bits)}")
    return "\n".join(lines)


async def _generate_workout_for(
    profile: Profile,
    day_offset: int,
    recent_logs: List["LoggedWorkout"],
) -> dict:
    """
    Ask the LLM for a workout tailored to profile + recent logs. Returns
    {"plan": dict, "prompt": str, "raw_response": str}. Raises on any
    failure (network, empty response, parse error) — the caller catches and
    falls back to the template so failure never reaches the client.
    """
    grouped = _pool_after_injuries(profile.injuries or "")
    if not grouped:
        raise ValueError("Injury filter removed every category from the pool")

    # Flat allowlist derived from the FILTERED pool. This is what validation
    # will check against — so a filtered exercise cannot slip back in even
    # if the model tries.
    allowed_names: set = set()
    pool_lines: List[str] = []
    for cat, exs in grouped.items():
        pool_lines.append(f"[{cat}]")
        for ex in exs:
            allowed_names.add(ex["name"])
            pool_lines.append(f"  - {ex['name']}")
    pool_text = "\n".join(pool_lines)

    logs_block = _format_recent_logs(recent_logs)

    injury_line = (
        f"- Client reports: {profile.injuries}. Avoid loading or aggravating "
        f"this area. Prefer alternatives that don't stress it (e.g. avoid "
        f"overhead pressing for shoulder issues, avoid deep-knee loading for "
        f"knee issues)."
        if profile.injuries and profile.injuries.strip()
        else "- No specific limitations reported."
    )

    system_message = (
        "You are an experienced strength & conditioning coach programming "
        "one training session at a time for a single client. You DO NOT "
        "invent exercise names. You may ONLY use exercise names taken "
        "verbatim from the ALLOWED_EXERCISES list — copy them exactly, "
        "including punctuation and capitalization. Your ENTIRE reply is a "
        "single JSON object matching the schema — no prose, no markdown "
        "fences, no explanation before or after."
    )

    user_prompt = f"""CLIENT PROFILE
- Goal: {profile.goal}
- Experience: {profile.experience}
- Training days per week: {profile.training_days}
- Equipment access: {profile.equipment}
- Job activity: {profile.job_activity}
- Average sleep: {profile.sleep_hours} h / night
- Stress: {profile.stress}
- Weight unit for prescribed loads: {profile.weight_unit}

INJURIES / LIMITATIONS
{injury_line}

RECENT SESSIONS (newest first — apply progressive overload from these):
{logs_block}

PROGRESSION RULES
- For a movement they've done recently at target reps with RPE <= 8 across all sets, prescribe a small overload (weight +2.5-5% or +1 rep).
- If any set was missed or RPE >= 9, HOLD or slightly reduce load.
- For a movement with no recent data, prescribe a conservative starter weight the client can hit for all sets at RPE <= 7.
- Rest between sets: heavy compound lifts 120-180s, hypertrophy 60-120s, accessories/conditioning 30-60s.

ALLOWED_EXERCISES (grouped by category — copy names EXACTLY, never invent):
{pool_text}

TASK
Design ONE workout for this client's next session (offset={day_offset} day from today). Pick a session name that fits the emphasis. The `name` you return MUST be one of the ALLOWED_CATEGORY_NAMES listed at the top of ALLOWED_EXERCISES (copied verbatim). You may pull exercises from any category, but the session's `name` itself must match one of the category labels exactly.

Select 4-7 exercises, ordered primary compound -> accessories/conditioning.

Return STRICT JSON only, matching this schema exactly:
{{
  "name": "<workout name>",
  "duration_min": <int between 20 and 90>,
  "exercises": [
    {{
      "name": "<exact name copied from ALLOWED_EXERCISES>",
      "target_sets": <int between 1 and 6>,
      "target_reps": "<string like '8-10' or '12' or '45s'>",
      "rest_seconds": <int between 0 and 300>,
      "starter_weight": <float in {profile.weight_unit}, 0 for bodyweight>
    }}
  ]
}}

Return ONLY the JSON object. No prose. No markdown fences. No explanation."""

    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY is not configured")

    chat = LlmChat(
        api_key=api_key,
        session_id=f"vyro-plan-{profile.id}-{day_offset}",
        system_message=system_message,
    ).with_model("openai", "gpt-5.4")

    raw = await chat.send_message(UserMessage(text=user_prompt))
    # send_message may return either the text directly or an object with
    # a .content attribute — accept both defensively.
    if hasattr(raw, "content"):
        response_text = str(raw.content)
    else:
        response_text = str(raw)

    # Strip accidental markdown fences (```json ... ```)
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        stripped_lines = [
            ln for ln in cleaned.splitlines()
            if not ln.strip().startswith("```")
        ]
        cleaned = "\n".join(stripped_lines).strip()

    try:
        plan = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"Model response was not valid JSON: {e}")

    return {"plan": plan, "prompt": user_prompt, "raw_response": response_text}


async def _fallback_plan_for(profile: Profile, day_offset: int) -> dict:
    """
    Deterministic template-based plan. Used both as the primary source for
    seeded history (day_offset > 0) and as the emergency fallback whenever
    AI generation fails or fails validation.

    Applies the same injury pre-filter as the AI path so a shoulder-injured
    client never sees "Overhead Press" just because the LLM was unreachable.
    """
    tpl = _pick_workout_for(profile, day_offset=day_offset)
    ex_defs_raw = WORKOUT_EXERCISES.get(tpl["name"], [])
    scale = _experience_scale(profile.experience)

    # Injury pre-filter: strip any blocked exercise names, no matter what
    # template the picker chose.
    injuries_l = (profile.injuries or "").lower()
    blocked_substrings: set = set()
    for keyword, names in INJURY_EXCLUSIONS.items():
        if keyword in injuries_l:
            for n in names:
                blocked_substrings.add(n.lower())

    filtered = [
        e for e in ex_defs_raw
        if not any(b in e["name"].lower() for b in blocked_substrings)
    ]

    # If the template got shredded by injuries, borrow from a "safer" template
    # of the same goal that survives filtering.
    if len(filtered) < 3:
        for alt_tpl in WORKOUT_TEMPLATES.get(profile.goal, []):
            alt_defs = WORKOUT_EXERCISES.get(alt_tpl["name"], [])
            alt_filtered = [
                e for e in alt_defs
                if not any(b in e["name"].lower() for b in blocked_substrings)
            ]
            if len(alt_filtered) >= 3:
                tpl = alt_tpl
                filtered = alt_filtered
                break

    return {
        "name": tpl["name"],
        "duration_min": tpl["duration_min"],
        "exercises": [
            {
                "name": e["name"],
                "target_sets": e["target_sets"],
                "target_reps": e["target_reps"],
                "rest_seconds": e["rest_seconds"],
                "starter_weight": _convert_weight(
                    float(e["starter_weight"]) * scale, profile.weight_unit
                ),
            }
            for e in filtered
        ],
    }


async def _get_or_generate_plan(profile: Profile, day_offset: int = 0) -> dict:
    """
    Returns a plan dict: {name, duration_min, exercises[]}.
    Caches by (profile_id, day_offset, date) in `generated_plans` so both
    /today and /workouts/today share one plan per day and cost one LLM call.
    """
    today_iso = datetime.now(timezone.utc).date().isoformat()

    cached = await db.generated_plans.find_one(
        {
            "profile_id": profile.id,
            "day_offset": day_offset,
            "date": today_iso,
        },
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if cached and cached.get("plan"):
        return cached["plan"]

    # No cache — try generation, fall back on any failure.
    recent_docs = (
        await db.logged_workouts.find(
            {"profile_id": profile.id}, {"_id": 0}
        )
        .sort("created_at", -1)
        .to_list(3)
    )
    recent_typed: List[LoggedWorkout] = []
    for r in recent_docs:
        try:
            recent_typed.append(LoggedWorkout(**r))
        except Exception:
            # Malformed historical row — skip, don't let it break generation.
            continue

    # Allowed name universe (filtered by injuries) for validation.
    grouped = _pool_after_injuries(profile.injuries or "")
    allowed_names: set = {
        ex["name"] for exs in grouped.values() for ex in exs
    }
    allowed_categories: set = set(grouped.keys())

    prompt_used = ""
    raw_resp = ""
    fallback_used = False
    plan: dict = {}
    validation_error: Optional[str] = None

    try:
        gen = await _generate_workout_for(profile, day_offset, recent_typed)
        prompt_used = gen["prompt"]
        raw_resp = gen["raw_response"]
        candidate = gen["plan"]
        if _validate_generated_workout(candidate, allowed_names, allowed_categories):
            plan = candidate
        else:
            validation_error = "validation_failed"
            raise ValueError("Generated plan failed validation")
    except Exception as e:
        logger.warning(
            "Workout generation fell back to template for profile %s: %s",
            profile.id, e,
        )
        fallback_used = True
        plan = await _fallback_plan_for(profile, day_offset)

    # Audit trail — never exposed to the client. Stores prompt + raw response
    # + whether we actually used the AI answer or the fallback.
    await db.generated_plans.insert_one(
        jsonable_encoder({
            "id": str(uuid.uuid4()),
            "profile_id": profile.id,
            "day_offset": day_offset,
            "date": today_iso,
            "prompt": prompt_used,
            "raw_response": raw_resp,
            "plan": plan,
            "fallback_used": fallback_used,
            "validation_error": validation_error,
            "created_at": datetime.now(timezone.utc),
        })
    )

    return plan


def _seed_recent_sessions(profile: Profile) -> List[Session]:
    rnd = random.Random(profile.id)
    sessions: List[Session] = []
    today = datetime.now(timezone.utc).date()
    target = profile.training_days
    all_slots = list(range(1, 6))
    workout_days = sorted(
        rnd.sample(all_slots, k=min(target, len(all_slots)) - 1 if target > 1 else 1)
    )
    for offset in all_slots:
        day = today - timedelta(days=offset)
        if offset in workout_days:
            tpl = _pick_workout_for(profile, day_offset=offset)
            sessions.append(
                Session(
                    profile_id=profile.id,
                    date=day.isoformat(),
                    status="workout",
                    workout_name=tpl["name"],
                    duration_min=tpl["duration_min"],
                )
            )
        else:
            status: SessionStatus = "missed" if rnd.random() < 0.15 else "rest"
            sessions.append(
                Session(profile_id=profile.id, date=day.isoformat(), status=status)
            )
    return sessions


def _compute_streak(sessions_desc: List[dict]) -> int:
    streak = 0
    for s in sessions_desc:
        if s["status"] in ("workout", "rest"):
            streak += 1
        else:
            break
    return streak


# ---------------- Logged workout models ----------------
class LoggedSetIn(BaseModel):
    weight: float = Field(ge=0)
    reps: int = Field(ge=0, le=1000)
    rpe: Optional[int] = Field(default=None, ge=1, le=10)


class LoggedExerciseIn(BaseModel):
    name: str
    sets: List[LoggedSetIn]


class LoggedWorkoutIn(BaseModel):
    workout_name: str
    weight_unit: WeightUnit
    duration_min: Optional[int] = None
    exercises: List[LoggedExerciseIn]


class LoggedWorkout(LoggedWorkoutIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_id: str
    date: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_volume: float
    sets_completed: int


def _summarize(exercises: List[LoggedExerciseIn]) -> tuple[float, int]:
    vol = 0.0
    sets = 0
    for ex in exercises:
        for s in ex.sets:
            vol += s.weight * s.reps
            sets += 1
    return round(vol, 1), sets


def _seed_previous_logged_workouts(profile: Profile) -> List[LoggedWorkout]:
    """
    Seed one previous logged workout per unique workout name in the recent
    session history — so the "last time" line under each exercise on today's
    detail view has real numbers from day one instead of showing "—".
    """
    scale = _experience_scale(profile.experience)
    rnd = random.Random(f"{profile.id}:prev")
    logged: List[LoggedWorkout] = []
    seen_names: set = set()
    for offset in range(1, 6):
        tpl = _pick_workout_for(profile, day_offset=offset)
        name = tpl["name"]
        if name in seen_names:
            continue
        seen_names.add(name)
        ex_defs = WORKOUT_EXERCISES.get(name, [])
        if not ex_defs:
            continue
        day = (datetime.now(timezone.utc).date() - timedelta(days=offset)).isoformat()

        logged_exercises: List[LoggedExerciseIn] = []
        for ex in ex_defs:
            base_kg = float(ex["starter_weight"]) * scale
            weight_disp = _convert_weight(base_kg, profile.weight_unit)
            # try to parse target rep count (take first int in "8-10" / "12" / "30s")
            reps_str = str(ex["target_reps"])
            # take just the first digit run so "6-8" → 6 and "45s" → 45.
            digits = ""
            for c in reps_str:
                if c.isdigit():
                    digits += c
                else:
                    if digits:
                        break
            base_reps = int(digits) if digits else 8
            sets_out: List[LoggedSetIn] = []
            for _ in range(ex["target_sets"]):
                jitter = 1 + (rnd.random() - 0.5) * 0.06
                sets_out.append(
                    LoggedSetIn(
                        weight=round(weight_disp, 1),
                        reps=max(1, int(round(base_reps * jitter))),
                        rpe=rnd.randint(6, 9),
                    )
                )
            logged_exercises.append(LoggedExerciseIn(name=ex["name"], sets=sets_out))

        vol, set_count = _summarize(logged_exercises)
        logged.append(
            LoggedWorkout(
                profile_id=profile.id,
                date=day,
                workout_name=name,
                weight_unit=profile.weight_unit,
                duration_min=tpl["duration_min"],
                exercises=logged_exercises,
                total_volume=vol,
                sets_completed=set_count,
            )
        )
    return logged


# ---------------- Profile endpoints ----------------
@api_router.post("/profiles", response_model=Profile)
async def create_profile(payload: ProfileCreate):
    profile = Profile(**payload.dict())
    doc = jsonable_encoder(profile)
    await db.profiles.insert_one(doc)
    sessions = _seed_recent_sessions(profile)
    if sessions:
        await db.sessions.insert_many([jsonable_encoder(s) for s in sessions])
    logged_prev = _seed_previous_logged_workouts(profile)
    if logged_prev:
        await db.logged_workouts.insert_many([jsonable_encoder(w) for w in logged_prev])
    today_meals = _seed_today_meals(profile)
    if today_meals:
        await db.logged_meals.insert_many([jsonable_encoder(m) for m in today_meals])
    return profile


@api_router.get("/profiles/{profile_id}", response_model=Profile)
async def get_profile(profile_id: str):
    doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    return Profile(**doc)


@api_router.get("/profiles", response_model=List[Profile])
async def list_profiles():
    docs = await db.profiles.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [Profile(**d) for d in docs]


# ---------------- Home ("today") endpoint ----------------
class TodayWorkout(BaseModel):
    name: str
    exercises: int
    duration_min: int


class TodayNutrition(BaseModel):
    calories_consumed: int
    calories_target: int
    protein_consumed: int
    protein_target: int
    carbs_consumed: int
    carbs_target: int
    fat_consumed: int
    fat_target: int


class HistoryEntry(BaseModel):
    date: str
    status: SessionStatus
    workout_name: Optional[str] = None


class TodayResponse(BaseModel):
    profile_id: str
    name: str
    today_date: str
    today_workout: TodayWorkout
    today_nutrition: TodayNutrition
    streak: int
    history: List[HistoryEntry]


@api_router.get("/profiles/{profile_id}/today", response_model=TodayResponse)
async def get_today(profile_id: str):
    profile_doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile_doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = Profile(**profile_doc)
    today = datetime.now(timezone.utc).date()

    tpl = await _get_or_generate_plan(profile, day_offset=0)
    workout = TodayWorkout(
        name=tpl["name"],
        exercises=len(tpl["exercises"]),
        duration_min=tpl["duration_min"],
    )

    rnd = random.Random(f"{profile.id}:nutrition:{today.isoformat()}")
    nutrition = await _compute_today_nutrition(profile)
    _ = rnd  # legacy seed retained for other deterministic use

    cutoff = (today - timedelta(days=5)).isoformat()
    session_docs = (
        await db.sessions.find(
            {"profile_id": profile_id, "date": {"$gte": cutoff}},
            {"_id": 0},
        ).sort("date", -1).to_list(10)
    )
    history = [
        HistoryEntry(
            date=s["date"],
            status=s["status"],
            workout_name=s.get("workout_name"),
        )
        for s in session_docs[:5]
    ]
    streak = _compute_streak(session_docs)

    return TodayResponse(
        profile_id=profile.id,
        name=profile.name,
        today_date=today.isoformat(),
        today_workout=workout,
        today_nutrition=nutrition,
        streak=streak,
        history=history,
    )


# ---------------- Workout detail + completion ----------------
class LastLogSet(BaseModel):
    weight: float
    reps: int
    rpe: Optional[int] = None


class LastLog(BaseModel):
    date: str
    sets: List[LastLogSet]


class ExerciseDetail(BaseModel):
    id: str
    name: str
    target_sets: int
    target_reps: str
    rest_seconds: int
    starter_weight: float  # in the profile's weight_unit
    last_log: Optional[LastLog] = None


class WorkoutDetail(BaseModel):
    profile_id: str
    workout_name: str
    weight_unit: WeightUnit
    duration_min: int
    exercises: List[ExerciseDetail]


@api_router.get(
    "/profiles/{profile_id}/workouts/today", response_model=WorkoutDetail
)
async def get_workout_today(profile_id: str):
    profile_doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile_doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = Profile(**profile_doc)

    plan = await _get_or_generate_plan(profile, day_offset=0)
    workout_name = plan["name"]
    duration_min = plan["duration_min"]

    ex_defs = plan["exercises"]  # already unit-converted (kg->display) upstream

    # Per-exercise last_log lookup: for each exercise in today's plan, find
    # the most recent LoggedWorkout by this profile that included that
    # exercise, regardless of the containing workout's name. This is more
    # correct for progressive-overload context — the client's last time
    # doing Back Squat is what matters, not the session it happened inside.
    plan_ex_names = [ex["name"] for ex in ex_defs]
    prev_by_ex: dict = {}
    prev_date_by_ex: dict = {}
    if plan_ex_names:
        prev_docs = (
            await db.logged_workouts.find(
                {
                    "profile_id": profile_id,
                    "exercises.name": {"$in": plan_ex_names},
                },
                {"_id": 0},
            )
            .sort("created_at", -1)
            .to_list(50)
        )
        remaining = set(plan_ex_names)
        for pd in prev_docs:
            if not remaining:
                break
            for ex in pd.get("exercises", []):
                n = ex.get("name")
                if n in remaining:
                    prev_by_ex[n] = ex.get("sets", [])
                    prev_date_by_ex[n] = pd.get("date", "")
                    remaining.discard(n)

    exercises: List[ExerciseDetail] = []
    for idx, ex in enumerate(ex_defs):
        starter_display = float(ex["starter_weight"])
        last_log_sets_raw = prev_by_ex.get(ex["name"], [])
        last_log = None
        if last_log_sets_raw:
            last_log = LastLog(
                date=prev_date_by_ex.get(ex["name"], ""),
                sets=[LastLogSet(**s) for s in last_log_sets_raw],
            )
        exercises.append(
            ExerciseDetail(
                id=f"ex-{idx}",
                name=ex["name"],
                target_sets=ex["target_sets"],
                target_reps=ex["target_reps"],
                rest_seconds=ex["rest_seconds"],
                starter_weight=starter_display,
                last_log=last_log,
            )
        )

    return WorkoutDetail(
        profile_id=profile.id,
        workout_name=workout_name,
        weight_unit=profile.weight_unit,
        duration_min=duration_min,
        exercises=exercises,
    )


class ExerciseSummary(BaseModel):
    name: str
    sets_completed: int
    volume: float


class WorkoutCompleteResponse(BaseModel):
    id: str
    workout_name: str
    weight_unit: WeightUnit
    date: str
    duration_min: Optional[int] = None
    total_volume: float
    sets_completed: int
    exercises: List[ExerciseSummary]
    previous_total_volume: Optional[float] = None
    previous_sets_completed: Optional[int] = None
    volume_delta_pct: Optional[float] = None
    sets_delta: Optional[int] = None


@api_router.post(
    "/profiles/{profile_id}/workouts/complete",
    response_model=WorkoutCompleteResponse,
)
async def complete_workout(profile_id: str, payload: LoggedWorkoutIn):
    profile_doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile_doc:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Reject a "workout" with zero completed sets — nothing to log.
    total_sets = sum(len(ex.sets) for ex in payload.exercises)
    if total_sets == 0:
        raise HTTPException(status_code=400, detail="No sets logged.")

    today_iso = datetime.now(timezone.utc).date().isoformat()

    # Fetch previous session with same workout name BEFORE inserting the new one.
    prev = await db.logged_workouts.find_one(
        {"profile_id": profile_id, "workout_name": payload.workout_name},
        {"_id": 0},
        sort=[("created_at", -1)],
    )

    total_volume, sets_completed = _summarize(payload.exercises)

    logged = LoggedWorkout(
        profile_id=profile_id,
        date=today_iso,
        workout_name=payload.workout_name,
        weight_unit=payload.weight_unit,
        duration_min=payload.duration_min,
        exercises=payload.exercises,
        total_volume=total_volume,
        sets_completed=sets_completed,
    )
    await db.logged_workouts.insert_one(jsonable_encoder(logged))

    # Upsert today's session as a "workout" so home history stays in sync.
    await db.sessions.update_one(
        {"profile_id": profile_id, "date": today_iso},
        {
            "$set": {
                "status": "workout",
                "workout_name": payload.workout_name,
                "duration_min": payload.duration_min,
            },
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "profile_id": profile_id,
                "date": today_iso,
            },
        },
        upsert=True,
    )

    ex_summaries: List[ExerciseSummary] = []
    for ex in payload.exercises:
        v = sum(s.weight * s.reps for s in ex.sets)
        ex_summaries.append(
            ExerciseSummary(name=ex.name, sets_completed=len(ex.sets), volume=round(v, 1))
        )

    prev_vol: Optional[float] = None
    prev_sets: Optional[int] = None
    vol_delta_pct: Optional[float] = None
    sets_delta: Optional[int] = None
    if prev:
        prev_vol = prev.get("total_volume")
        prev_sets = prev.get("sets_completed")
        if prev_vol is not None and prev_vol > 0:
            vol_delta_pct = round(((total_volume - prev_vol) / prev_vol) * 100, 1)
        if prev_sets is not None:
            sets_delta = sets_completed - prev_sets

    return WorkoutCompleteResponse(
        id=logged.id,
        workout_name=logged.workout_name,
        weight_unit=logged.weight_unit,
        date=logged.date,
        duration_min=logged.duration_min,
        total_volume=total_volume,
        sets_completed=sets_completed,
        exercises=ex_summaries,
        previous_total_volume=prev_vol,
        previous_sets_completed=prev_sets,
        volume_delta_pct=vol_delta_pct,
        sets_delta=sets_delta,
    )


# ---------------- Nutrition ----------------
MealType = Literal["breakfast", "lunch", "dinner", "snack"]

# Small hand-curated catalog. Enough range to feel like a real product without
# pulling in a full USDA CSV. Portion column is a human-readable label; the
# macros are for exactly that portion (not per-100g) so the "servings" math on
# the frontend stays simple: qty * (calories, protein, carbs, fat).
FOOD_CATALOG_RAW = [
    # id, name, portion, kcal, protein, carbs, fat
    ("f-001", "Chicken breast, grilled",     "100 g",       165, 31.0, 0.0,  3.6),
    ("f-002", "Chicken thigh, grilled",      "100 g",       209, 26.0, 0.0, 11.0),
    ("f-003", "Salmon fillet, baked",        "100 g",       206, 22.0, 0.0, 13.0),
    ("f-004", "White rice, cooked",          "1 cup (158g)", 205,  4.3, 45.0, 0.4),
    ("f-005", "Brown rice, cooked",          "1 cup (195g)", 216,  5.0, 45.0, 1.8),
    ("f-006", "Sweet potato, baked",         "1 medium",     103,  2.3, 24.0, 0.2),
    ("f-007", "Oatmeal, cooked",             "1 cup",        158,  6.0, 27.0, 3.2),
    ("f-008", "Rolled oats, dry",            "40 g",         150,  5.0, 27.0, 3.0),
    ("f-009", "Banana",                      "1 medium",     105,  1.3, 27.0, 0.4),
    ("f-010", "Apple",                       "1 medium",      95,  0.5, 25.0, 0.3),
    ("f-011", "Blueberries",                 "1 cup",         84,  1.1, 21.0, 0.5),
    ("f-012", "Strawberries",                "1 cup",         49,  1.0, 12.0, 0.5),
    ("f-013", "Greek yogurt, plain 0%",      "170 g",         100, 17.0, 6.0,  0.7),
    ("f-014", "Greek yogurt, plain 2%",      "170 g",         146, 20.0, 8.0,  4.0),
    ("f-015", "Cottage cheese, low-fat",     "1 cup",         163, 28.0, 6.0,  2.3),
    ("f-016", "Milk, whole",                 "1 cup",         149,  8.0, 12.0, 8.0),
    ("f-017", "Milk, skim",                  "1 cup",          83,  8.0, 12.0, 0.2),
    ("f-018", "Almond milk, unsweetened",    "1 cup",          30,  1.0,  1.0, 2.5),
    ("f-019", "Egg, whole",                  "1 large",        72,  6.3, 0.4,  4.8),
    ("f-020", "Egg whites",                  "3 large",        51, 10.8, 0.7,  0.2),
    ("f-021", "Peanut butter",               "2 tbsp",         188,  8.0, 6.0, 16.0),
    ("f-022", "Almond butter",               "2 tbsp",         196,  6.7, 6.6, 18.0),
    ("f-023", "Almonds",                     "28 g (~23)",     164,  6.0, 6.0, 14.0),
    ("f-024", "Walnuts",                     "28 g",           185,  4.3, 3.9, 18.5),
    ("f-025", "Avocado",                     "1/2 fruit",      120,  1.5, 6.4, 11.0),
    ("f-026", "Olive oil",                   "1 tbsp",         119,  0.0, 0.0, 13.5),
    ("f-027", "Butter",                      "1 tbsp",         102,  0.1, 0.0, 11.5),
    ("f-028", "Bread, whole wheat",          "1 slice",         81,  4.0, 14.0, 1.1),
    ("f-029", "Bagel, plain",                "1 medium",       245, 10.0, 48.0, 1.5),
    ("f-030", "Tortilla, flour",             "1 (8 in)",       144,  4.0, 24.0, 3.6),
    ("f-031", "Pasta, cooked",               "1 cup",          220,  8.0, 43.0, 1.3),
    ("f-032", "Quinoa, cooked",              "1 cup",          222,  8.1, 39.4, 3.6),
    ("f-033", "Black beans, cooked",         "1 cup",          227, 15.0, 41.0, 0.9),
    ("f-034", "Lentils, cooked",             "1 cup",          230, 18.0, 40.0, 0.8),
    ("f-035", "Chickpeas, canned",           "1 cup",          269, 14.5, 45.0, 4.2),
    ("f-036", "Tofu, firm",                  "100 g",           76,  8.0, 1.9, 4.8),
    ("f-037", "Tempeh",                      "100 g",          195, 20.3, 7.6, 11.4),
    ("f-038", "Ground beef, 90/10",          "100 g",          176, 20.0, 0.0, 10.0),
    ("f-039", "Ground turkey, 93/7",         "100 g",          170, 21.0, 0.0, 9.0),
    ("f-040", "Cod, baked",                  "100 g",          105, 23.0, 0.0, 0.9),
    ("f-041", "Shrimp, cooked",              "100 g",           99, 24.0, 0.2, 0.3),
    ("f-042", "Tuna, canned in water",       "100 g",          116, 25.5, 0.0, 0.8),
    ("f-043", "Broccoli, cooked",            "1 cup",           55,  3.7, 11.0, 0.6),
    ("f-044", "Spinach, raw",                "1 cup",            7,  0.9, 1.1, 0.1),
    ("f-045", "Kale, raw",                   "1 cup",           33,  2.9, 6.7, 0.5),
    ("f-046", "Bell pepper",                 "1 medium",        24,  1.0, 6.0, 0.2),
    ("f-047", "Tomato",                      "1 medium",        22,  1.1, 4.8, 0.2),
    ("f-048", "Cucumber",                    "1 cup sliced",    16,  0.7, 3.8, 0.1),
    ("f-049", "Mixed greens",                "2 cups",          15,  1.2, 3.0, 0.2),
    ("f-050", "Carrots, raw",                "1 cup",           50,  1.1, 12.0, 0.3),
    ("f-051", "Protein shake, whey",         "1 scoop (30g)",  120, 24.0, 3.0,  1.5),
    ("f-052", "Protein bar",                 "1 bar (60g)",    220, 20.0, 22.0, 7.0),
    ("f-053", "Coffee, black",               "1 cup",            2,  0.3, 0.0, 0.0),
    ("f-054", "Latte, whole milk",           "12 oz",          180, 10.0, 15.0, 9.0),
    ("f-055", "Orange juice",                "1 cup",          112,  1.7, 26.0, 0.5),
    ("f-056", "Water",                       "1 cup",            0,  0.0, 0.0, 0.0),
    ("f-057", "Dark chocolate, 70%",         "1 oz (28g)",     170,  2.0, 13.0, 12.0),
    ("f-058", "Rice cake",                   "1 cake",          35,  0.7, 7.0, 0.3),
    ("f-059", "Cheddar cheese",              "1 oz",           113,  7.0, 0.4, 9.3),
    ("f-060", "Mozzarella, part-skim",       "1 oz",            72,  6.9, 0.8, 4.5),
    ("f-061", "Hummus",                      "2 tbsp",          70,  2.0, 4.0, 5.5),
    ("f-062", "Honey",                       "1 tbsp",          64,  0.1, 17.0, 0.0),
    ("f-063", "Peanut M&M's",                "1 fun-size",      93,  1.7, 11.0, 4.7),
    ("f-064", "Pizza, cheese",               "1 slice",        272, 12.0, 34.0, 10.0),
    ("f-065", "Sushi roll, salmon avocado",  "8 pieces",       304, 13.0, 42.0, 9.0),
    ("f-066", "Burrito bowl, chicken",       "1 bowl",         605, 40.0, 65.0, 22.0),
    ("f-067", "Cesar salad w/ chicken",      "1 bowl",         420, 30.0, 18.0, 26.0),
    ("f-068", "Turkey sandwich",             "1 sandwich",     360, 27.0, 40.0, 10.0),
    ("f-069", "Big Mac",                     "1 sandwich",     563, 25.5, 45.0, 33.0),
    ("f-070", "Diet soda",                   "12 oz can",        0,  0.0, 0.0, 0.0),
]


class FoodItem(BaseModel):
    id: str
    name: str
    portion: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


FOOD_CATALOG: List[FoodItem] = [
    FoodItem(
        id=f[0], name=f[1], portion=f[2],
        calories=f[3], protein_g=f[4], carbs_g=f[5], fat_g=f[6],
    )
    for f in FOOD_CATALOG_RAW
]
FOOD_BY_ID = {f.id: f for f in FOOD_CATALOG}


class MealEntryIn(BaseModel):
    food_id: str
    meal_type: MealType
    servings: float = Field(gt=0, le=20)


class MealEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_id: str
    date: str
    meal_type: MealType
    food_id: str
    food_name: str
    portion: str
    servings: float
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def _build_meal_entry(profile_id: str, food: FoodItem, meal_type: MealType,
                     servings: float, date_iso: str) -> MealEntry:
    return MealEntry(
        profile_id=profile_id,
        date=date_iso,
        meal_type=meal_type,
        food_id=food.id,
        food_name=food.name,
        portion=food.portion,
        servings=round(servings, 2),
        calories=round(food.calories * servings, 1),
        protein_g=round(food.protein_g * servings, 1),
        carbs_g=round(food.carbs_g * servings, 1),
        fat_g=round(food.fat_g * servings, 1),
    )


def _seed_today_meals(profile: Profile) -> List[MealEntry]:
    """
    Give the first-launch nutrition screen something to render. Deterministic
    per profile so refreshing doesn't shuffle it. Only fires when there's no
    logged_meals row for today yet.
    """
    today_iso = datetime.now(timezone.utc).date().isoformat()
    rnd = random.Random(f"{profile.id}:meals:{today_iso}")
    picks: List[tuple[str, str, float]] = [
        (rnd.choice(["f-013", "f-014", "f-008", "f-007"]), "breakfast", 1.0),  # yogurt/oats
        (rnd.choice(["f-009", "f-010", "f-011"]),          "breakfast", 1.0),  # fruit
        (rnd.choice(["f-051", "f-053"]),                   "breakfast", 1.0),  # shake/coffee
    ]
    # sometimes add a snack
    if rnd.random() > 0.3:
        picks.append(
            (rnd.choice(["f-023", "f-052", "f-058", "f-025"]), "snack", 1.0)
        )
    entries: List[MealEntry] = []
    for fid, mt, srv in picks:
        f = FOOD_BY_ID.get(fid)
        if not f:
            continue
        entries.append(_build_meal_entry(profile.id, f, mt, srv, today_iso))
    return entries


async def _compute_today_nutrition(profile: Profile) -> "TodayNutrition":
    today_iso = datetime.now(timezone.utc).date().isoformat()
    docs = await db.logged_meals.find(
        {"profile_id": profile.id, "date": today_iso},
        {"_id": 0},
    ).to_list(500)
    kcal = sum(d.get("calories", 0) for d in docs)
    p = sum(d.get("protein_g", 0) for d in docs)
    c = sum(d.get("carbs_g", 0) for d in docs)
    f = sum(d.get("fat_g", 0) for d in docs)
    t = profile.targets
    return TodayNutrition(
        calories_consumed=int(round(kcal)),
        calories_target=t.calories,
        protein_consumed=int(round(p)),
        protein_target=t.protein_g,
        carbs_consumed=int(round(c)),
        carbs_target=t.carbs_g,
        fat_consumed=int(round(f)),
        fat_target=t.fat_g,
    )


# ---------------- Nutrition endpoints ----------------
class FoodSearchResponse(BaseModel):
    query: str
    results: List[FoodItem]


@api_router.get("/foods", response_model=FoodSearchResponse)
async def search_foods(q: str = "", limit: int = 30):
    query = q.strip().lower()
    if not query:
        # Alphabetical slice — same shape as a search response so the frontend
        # can render an empty-query state without a special code path.
        return FoodSearchResponse(query="", results=FOOD_CATALOG[:limit])

    scored: List[tuple[int, FoodItem]] = []
    for f in FOOD_CATALOG:
        name_l = f.name.lower()
        if query == name_l:
            score = 0
        elif name_l.startswith(query):
            score = 1
        elif f" {query}" in f" {name_l}":  # word-boundary contains
            score = 2
        elif query in name_l:
            score = 3
        else:
            continue
        scored.append((score, f))
    scored.sort(key=lambda t: (t[0], t[1].name.lower()))
    return FoodSearchResponse(query=q, results=[f for _, f in scored[:limit]])


class RecentFood(BaseModel):
    food: FoodItem
    last_used: datetime
    log_count: int  # how many times ever logged — proxy for "favorite"


class RecentFoodsResponse(BaseModel):
    profile_id: str
    recent: List[RecentFood]


@api_router.get(
    "/profiles/{profile_id}/foods/recent",
    response_model=RecentFoodsResponse,
)
async def get_recent_foods(profile_id: str, limit: int = 8):
    profile_doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile_doc:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Group logged_meals by food_id and pick out most recent + total count.
    pipeline = [
        {"$match": {"profile_id": profile_id}},
        {
            "$group": {
                "_id": "$food_id",
                "last_used": {"$max": "$created_at"},
                "log_count": {"$sum": 1},
            }
        },
        {"$sort": {"last_used": -1}},
        {"$limit": max(limit, 1)},
    ]
    grouped = await db.logged_meals.aggregate(pipeline).to_list(limit)
    recent: List[RecentFood] = []
    for g in grouped:
        f = FOOD_BY_ID.get(g["_id"])
        if not f:
            continue
        # last_used may come back as a plain datetime or an ISO-8601 string
        # (motor is content to store either). Normalize to datetime so the
        # Pydantic model's serializer is happy either way.
        lu_raw = g["last_used"]
        if isinstance(lu_raw, datetime):
            lu = lu_raw
        else:
            try:
                lu = datetime.fromisoformat(str(lu_raw).replace("Z", "+00:00"))
            except Exception:
                lu = datetime.now(timezone.utc)
        recent.append(RecentFood(food=f, last_used=lu, log_count=g["log_count"]))
    return RecentFoodsResponse(profile_id=profile_id, recent=recent)


@api_router.post(
    "/profiles/{profile_id}/meals",
    response_model=MealEntry,
)
async def log_meal(profile_id: str, payload: MealEntryIn):
    profile_doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile_doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    food = FOOD_BY_ID.get(payload.food_id)
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    today_iso = datetime.now(timezone.utc).date().isoformat()
    entry = _build_meal_entry(profile_id, food, payload.meal_type, payload.servings, today_iso)
    await db.logged_meals.insert_one(jsonable_encoder(entry))
    return entry


@api_router.delete("/profiles/{profile_id}/meals/{meal_id}")
async def delete_meal(profile_id: str, meal_id: str):
    result = await db.logged_meals.delete_one(
        {"id": meal_id, "profile_id": profile_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meal not found")
    return {"ok": True, "id": meal_id}


class MealGroup(BaseModel):
    meal_type: MealType
    entries: List[MealEntry]
    subtotal_calories: int
    subtotal_protein: int
    subtotal_carbs: int
    subtotal_fat: int


class NutritionTodayResponse(BaseModel):
    profile_id: str
    date: str
    nutrition: TodayNutrition
    meals: List[MealGroup]


MEAL_ORDER: List[MealType] = ["breakfast", "lunch", "dinner", "snack"]


@api_router.get(
    "/profiles/{profile_id}/nutrition/today",
    response_model=NutritionTodayResponse,
)
async def get_nutrition_today(profile_id: str):
    profile_doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile_doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = Profile(**profile_doc)
    today_iso = datetime.now(timezone.utc).date().isoformat()

    docs = (
        await db.logged_meals.find(
            {"profile_id": profile_id, "date": today_iso},
            {"_id": 0},
        )
        .sort("created_at", 1)
        .to_list(500)
    )

    grouped: dict = {mt: [] for mt in MEAL_ORDER}
    for d in docs:
        mt = d.get("meal_type", "snack")
        if mt not in grouped:
            grouped[mt] = []
        grouped[mt].append(MealEntry(**d))

    meal_groups: List[MealGroup] = []
    for mt in MEAL_ORDER:
        entries = grouped.get(mt, [])
        meal_groups.append(
            MealGroup(
                meal_type=mt,
                entries=entries,
                subtotal_calories=int(round(sum(e.calories for e in entries))),
                subtotal_protein=int(round(sum(e.protein_g for e in entries))),
                subtotal_carbs=int(round(sum(e.carbs_g for e in entries))),
                subtotal_fat=int(round(sum(e.fat_g for e in entries))),
            )
        )

    nutrition = await _compute_today_nutrition(profile)
    return NutritionTodayResponse(
        profile_id=profile_id,
        date=today_iso,
        nutrition=nutrition,
        meals=meal_groups,
    )


# ---------------- Wire up ----------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
