"""VYRO iteration 3 backend tests — profiles seed + /today endpoint."""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or os.environ.get('EXPO_BACKEND_URL')
if not BASE_URL:
    # fallback to frontend/.env parse — but should always be set
    with open('/app/frontend/.env') as fh:
        for line in fh:
            if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip('/')


VALID_PAYLOAD = {
    "name": "TEST_Alex Rivera",
    "age": 30,
    "sex": "male",
    "height_cm": 178.0,
    "weight": 78.0,
    "weight_unit": "kg",
    "goal": "muscle_gain",
    "job_activity": "desk",
    "sleep_hours": 7,
    "stress": "moderate",
    "training_days": 4,
    "experience": "intermediate",
    "injuries": "",
    "equipment": "gym",
    "targets": {
        "calories": 2600,
        "protein_g": 170,
        "carbs_g": 290,
        "fat_g": 80,
        "bmr": 1800,
        "tdee": 2500,
    },
}


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_profile(api):
    r = api.post(f"{BASE_URL}/api/profiles", json=VALID_PAYLOAD, timeout=30)
    assert r.status_code == 200, f"profile create failed: {r.status_code} {r.text}"
    body = r.json()
    assert "_id" not in body
    assert body["name"] == VALID_PAYLOAD["name"]
    assert body.get("id")
    return body


# --- Profile creation + seeding sessions ---
class TestProfileSeed:
    def test_profile_created_no_object_id(self, created_profile):
        assert "_id" not in created_profile
        assert isinstance(created_profile["id"], str)

    def test_get_profile_by_id(self, api, created_profile):
        r = api.get(f"{BASE_URL}/api/profiles/{created_profile['id']}")
        assert r.status_code == 200
        j = r.json()
        assert "_id" not in j
        assert j["id"] == created_profile["id"]

    def test_get_profile_unknown_404(self, api):
        r = api.get(f"{BASE_URL}/api/profiles/does-not-exist-uuid")
        assert r.status_code == 404


# --- /today contract ---
class TestTodayEndpoint:
    def test_today_returns_all_fields(self, api, created_profile):
        pid = created_profile["id"]
        r = api.get(f"{BASE_URL}/api/profiles/{pid}/today")
        assert r.status_code == 200, r.text
        j = r.json()
        assert "_id" not in j
        # top-level fields
        for k in ("profile_id", "name", "today_date", "today_workout",
                  "today_nutrition", "streak", "history"):
            assert k in j, f"missing {k}"
        assert j["profile_id"] == pid
        assert j["name"] == VALID_PAYLOAD["name"]
        # date is YYYY-MM-DD and today
        today = datetime.now(timezone.utc).date().isoformat()
        assert j["today_date"] == today

    def test_today_workout_shape(self, api, created_profile):
        j = api.get(f"{BASE_URL}/api/profiles/{created_profile['id']}/today").json()
        w = j["today_workout"]
        assert isinstance(w["name"], str) and w["name"]
        assert isinstance(w["exercises"], int) and w["exercises"] > 0
        assert isinstance(w["duration_min"], int) and w["duration_min"] > 0

    def test_today_nutrition_shape(self, api, created_profile):
        j = api.get(f"{BASE_URL}/api/profiles/{created_profile['id']}/today").json()
        n = j["today_nutrition"]
        for k in ("calories_consumed", "calories_target",
                  "protein_consumed", "protein_target",
                  "carbs_consumed", "carbs_target",
                  "fat_consumed", "fat_target"):
            assert k in n and isinstance(n[k], int)
        # targets should match seed input
        assert n["calories_target"] == VALID_PAYLOAD["targets"]["calories"]
        assert n["protein_target"] == VALID_PAYLOAD["targets"]["protein_g"]
        assert n["carbs_target"] == VALID_PAYLOAD["targets"]["carbs_g"]
        assert n["fat_target"] == VALID_PAYLOAD["targets"]["fat_g"]
        # consumed <= target broadly reasonable (calories should not exceed target grossly)
        assert 0 < n["calories_consumed"] <= n["calories_target"]

    def test_today_history_last_5_days(self, api, created_profile):
        j = api.get(f"{BASE_URL}/api/profiles/{created_profile['id']}/today").json()
        history = j["history"]
        assert isinstance(history, list)
        assert 1 <= len(history) <= 5
        allowed = {"workout", "rest", "missed"}
        today = datetime.now(timezone.utc).date()
        for h in history:
            assert h["status"] in allowed
            # date within last 5 days
            d = datetime.strptime(h["date"], "%Y-%m-%d").date()
            assert (today - d) <= timedelta(days=6)
        # newest first (descending)
        dates = [h["date"] for h in history]
        assert dates == sorted(dates, reverse=True)

    def test_streak_consistent_with_history(self, api, created_profile):
        j = api.get(f"{BASE_URL}/api/profiles/{created_profile['id']}/today").json()
        streak = j["streak"]
        assert isinstance(streak, int)
        # recompute expected streak from returned history (workout/rest active)
        expected = 0
        for h in j["history"]:
            if h["status"] in ("workout", "rest"):
                expected += 1
            else:
                break
        # backend uses all sessions <= 5 days ago (may include one more edge). Allow >= expected.
        assert streak >= expected

    def test_today_unknown_profile_404(self, api):
        r = api.get(f"{BASE_URL}/api/profiles/nope-not-real/today")
        assert r.status_code == 404


# --- Session seeding assertion (indirect via /today) ---
class TestSessionSeeding:
    def test_new_profile_seeds_sessions(self, api):
        payload = dict(VALID_PAYLOAD)
        payload["name"] = "TEST_Session Seed"
        r = api.post(f"{BASE_URL}/api/profiles", json=payload)
        assert r.status_code == 200
        pid = r.json()["id"]
        t = api.get(f"{BASE_URL}/api/profiles/{pid}/today").json()
        assert len(t["history"]) >= 1  # at least one seeded session
        assert all(h["status"] in ("workout", "rest", "missed") for h in t["history"])
