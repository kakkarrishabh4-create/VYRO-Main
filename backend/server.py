from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.encoders import jsonable_encoder
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta, date


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
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
    date: str  # ISO date, YYYY-MM-DD
    status: SessionStatus
    workout_name: Optional[str] = None
    duration_min: Optional[int] = None


# ---------------- VYRO — Workout templates ----------------
# Deterministic "today's plan" pulled from a small pool. Real programming
# will replace this once the coach-authored workout builder lands.
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


def _pick_workout_for(profile: Profile, day_offset: int = 0) -> dict:
    pool = WORKOUT_TEMPLATES[profile.goal]
    # deterministic per (profile, day) so a client sees the same plan on
    # refresh but a different one tomorrow.
    seed = hash(f"{profile.id}:{day_offset}") % len(pool)
    return pool[seed]


def _seed_recent_sessions(profile: Profile) -> List[Session]:
    """
    Seed a lightweight 5-day-back history so the thread on the home screen
    has something to draw immediately. Once the workout / rest logging UI
    exists, real entries will layer on top of this seed.

    Distribution is realistic-ish: mostly workouts on training days, some
    rest, occasional missed — deterministic per profile.
    """
    rnd = random.Random(profile.id)
    sessions: List[Session] = []
    today = datetime.now(timezone.utc).date()
    # target days per week vs 5-day window
    target = profile.training_days
    # pre-pick which of the last 5 days should be workout days
    all_slots = list(range(1, 6))  # 1..5 days ago (skip today)
    workout_days = sorted(rnd.sample(all_slots, k=min(target, len(all_slots)) - 1 if target > 1 else 1))

    for offset in all_slots:
        day = today - timedelta(days=offset)
        if offset in workout_days:
            tpl = _pick_workout_for(profile, day_offset=offset)
            status: SessionStatus = "workout"
            sessions.append(
                Session(
                    profile_id=profile.id,
                    date=day.isoformat(),
                    status=status,
                    workout_name=tpl["name"],
                    duration_min=tpl["duration_min"],
                )
            )
        else:
            # 15% chance of a missed day among non-training days, else rest
            status = "missed" if rnd.random() < 0.15 else "rest"
            sessions.append(
                Session(
                    profile_id=profile.id, date=day.isoformat(), status=status
                )
            )

    return sessions


def _compute_streak(sessions_desc: List[dict]) -> int:
    """
    Consecutive active days ending today or yesterday. "Active" = workout
    OR rest (a planned rest is not a break in the streak; a missed day is).
    Sessions are expected sorted date-desc.
    """
    streak = 0
    for s in sessions_desc:
        if s["status"] in ("workout", "rest"):
            streak += 1
        else:
            break
    return streak


# ---------------- VYRO — Profile endpoints ----------------
@api_router.post("/profiles", response_model=Profile)
async def create_profile(payload: ProfileCreate):
    profile = Profile(**payload.dict())
    doc = jsonable_encoder(profile)
    await db.profiles.insert_one(doc)
    # seed 5-day history so the client's home screen has something to draw
    sessions = _seed_recent_sessions(profile)
    if sessions:
        await db.sessions.insert_many([jsonable_encoder(s) for s in sessions])
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


# ---------------- VYRO — Home ("today") endpoint ----------------
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
    history: List[HistoryEntry]  # last 5 days, newest first


@api_router.get("/profiles/{profile_id}/today", response_model=TodayResponse)
async def get_today(profile_id: str):
    profile_doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile_doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = Profile(**profile_doc)

    today = datetime.now(timezone.utc).date()

    # ---- Today's workout (deterministic from templates) ----
    tpl = _pick_workout_for(profile, day_offset=0)
    workout = TodayWorkout(
        name=tpl["name"],
        exercises=tpl["exercises"],
        duration_min=tpl["duration_min"],
    )

    # ---- Today's nutrition ----
    # A logged-meal endpoint doesn't exist yet, so we surface a "day in
    # progress" snapshot: ~40% of targets consumed, seeded by profile id
    # for stability across refresh.
    rnd = random.Random(f"{profile.id}:nutrition:{today.isoformat()}")
    frac = 0.30 + rnd.random() * 0.35  # 30–65% into the day's targets
    t = profile.targets
    nutrition = TodayNutrition(
        calories_consumed=int(t.calories * frac),
        calories_target=t.calories,
        protein_consumed=int(t.protein_g * (frac + 0.05)),
        protein_target=t.protein_g,
        carbs_consumed=int(t.carbs_g * (frac - 0.05)),
        carbs_target=t.carbs_g,
        fat_consumed=int(t.fat_g * frac),
        fat_target=t.fat_g,
    )

    # ---- Last 5 days from sessions collection ----
    cutoff = (today - timedelta(days=5)).isoformat()
    session_docs = (
        await db.sessions.find(
            {"profile_id": profile_id, "date": {"$gte": cutoff}},
            {"_id": 0},
        )
        .sort("date", -1)
        .to_list(10)
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


# Include the router in the main app
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
