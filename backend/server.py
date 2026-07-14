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
from datetime import datetime, timezone, timedelta


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

    tpl = _pick_workout_for(profile, day_offset=0)
    workout = TodayWorkout(
        name=tpl["name"],
        exercises=tpl["exercises"],
        duration_min=tpl["duration_min"],
    )

    rnd = random.Random(f"{profile.id}:nutrition:{today.isoformat()}")
    frac = 0.30 + rnd.random() * 0.35
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

    tpl = _pick_workout_for(profile, day_offset=0)
    workout_name = tpl["name"]
    duration_min = tpl["duration_min"]

    ex_defs = WORKOUT_EXERCISES.get(workout_name, [])

    # Most recent prior logged workout with this name (for last_log context).
    prev = await db.logged_workouts.find_one(
        {"profile_id": profile_id, "workout_name": workout_name},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    prev_by_ex: dict = {}
    if prev:
        for ex in prev.get("exercises", []):
            prev_by_ex[ex["name"]] = ex["sets"]
        prev_date = prev.get("date", "")
    else:
        prev_date = ""

    scale = _experience_scale(profile.experience)

    exercises: List[ExerciseDetail] = []
    for idx, ex in enumerate(ex_defs):
        base_kg = float(ex["starter_weight"]) * scale
        starter_display = _convert_weight(base_kg, profile.weight_unit)
        last_log_sets_raw = prev_by_ex.get(ex["name"], [])
        last_log = None
        if last_log_sets_raw:
            last_log = LastLog(
                date=prev_date,
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
