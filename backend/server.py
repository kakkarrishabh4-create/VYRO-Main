from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.encoders import jsonable_encoder
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
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


# ---------------- VYRO — Client profiles ----------------
Sex = Literal["male", "female"]
WeightUnit = Literal["kg", "lb"]
Goal = Literal["fat_loss", "muscle_gain", "recomposition", "general", "endurance"]
JobActivity = Literal["desk", "active", "manual"]
Stress = Literal["low", "moderate", "high"]
Experience = Literal["beginner", "intermediate", "advanced"]
Equipment = Literal["home", "gym", "none"]


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


@api_router.post("/profiles", response_model=Profile)
async def create_profile(payload: ProfileCreate):
    profile = Profile(**payload.dict())
    # jsonable_encoder converts datetime -> ISO string so Mongo mutation of the
    # source dict doesn't propagate an ObjectId back into the response path.
    doc = jsonable_encoder(profile)
    await db.profiles.insert_one(doc)
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


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
