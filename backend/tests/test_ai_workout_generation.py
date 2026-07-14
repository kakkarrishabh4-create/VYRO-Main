"""VYRO iteration 6 — AI workout generation unit + integration tests.

Covers the deterministic pieces that don't depend on the live LLM:
  • _validate_generated_workout — schema + allowlist + category enforcement
  • _pool_after_injuries — pre-filter safety layer
  • _get_or_generate_plan — cache reuse, fallback recording, no client leak
  • End-to-end: the two endpoints (/today, /workouts/today) still return
    the same response shape whether the AI path succeeded or fell back.
"""
import os
import sys
import asyncio
import pytest
import requests

# Path setup so we can import the server module for unit-level tests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import server  # noqa: E402
from server import (  # noqa: E402
    _validate_generated_workout,
    _pool_after_injuries,
    WORKOUT_EXERCISES,
    INJURY_EXCLUSIONS,
)

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or os.environ.get('EXPO_BACKEND_URL')
if not BASE_URL:
    with open('/app/frontend/.env') as fh:
        for line in fh:
            if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip('/')


BASE_PROFILE = {
    "name": "TEST_AI Workout",
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
        "calories": 2800, "protein_g": 210, "carbs_g": 320,
        "fat_g": 80, "bmr": 1780, "tdee": 2540,
    },
}


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _make_profile(api, overrides=None):
    payload = dict(BASE_PROFILE)
    if overrides:
        payload.update(overrides)
    r = api.post(f"{BASE_URL}/api/profiles", json=payload, timeout=30)
    assert r.status_code == 200, f"profile create failed: {r.text}"
    return r.json()


# ---------- Unit: _validate_generated_workout ----------
class TestValidateGeneratedWorkout:
    def _allowed(self):
        names = {e["name"] for exs in WORKOUT_EXERCISES.values() for e in exs}
        cats = set(WORKOUT_EXERCISES.keys())
        return names, cats

    def test_valid_plan_passes(self):
        names, cats = self._allowed()
        good = {
            "name": "Push · Chest & Shoulders",
            "duration_min": 60,
            "exercises": [
                {"name": "Barbell Bench Press", "target_sets": 4,
                 "target_reps": "6-8", "rest_seconds": 150,
                 "starter_weight": 60.0},
                {"name": "Overhead Press", "target_sets": 3,
                 "target_reps": "8", "rest_seconds": 120,
                 "starter_weight": 35.0},
            ],
        }
        assert _validate_generated_workout(good, names, cats) is True

    def test_invented_exercise_name_rejected(self):
        names, cats = self._allowed()
        bad = {
            "name": "Push · Chest & Shoulders",
            "duration_min": 60,
            "exercises": [
                {"name": "Neon Lightsaber Snatch", "target_sets": 3,
                 "target_reps": "8", "rest_seconds": 90,
                 "starter_weight": 20.0},
            ],
        }
        assert _validate_generated_workout(bad, names, cats) is False

    def test_invented_workout_name_rejected(self):
        names, cats = self._allowed()
        bad = {
            "name": "The Ultimate Beast Session",  # not a category
            "duration_min": 60,
            "exercises": [
                {"name": "Barbell Bench Press", "target_sets": 4,
                 "target_reps": "8", "rest_seconds": 120,
                 "starter_weight": 60.0},
            ],
        }
        assert _validate_generated_workout(bad, names, cats) is False

    def test_target_sets_out_of_range(self):
        names, cats = self._allowed()
        bad = {
            "name": "Push · Chest & Shoulders",
            "duration_min": 60,
            "exercises": [
                {"name": "Barbell Bench Press", "target_sets": 12,
                 "target_reps": "8", "rest_seconds": 120,
                 "starter_weight": 60.0},
            ],
        }
        assert _validate_generated_workout(bad, names, cats) is False

    def test_empty_target_reps_rejected(self):
        names, cats = self._allowed()
        bad = {
            "name": "Push · Chest & Shoulders",
            "duration_min": 60,
            "exercises": [
                {"name": "Barbell Bench Press", "target_sets": 4,
                 "target_reps": "", "rest_seconds": 120,
                 "starter_weight": 60.0},
            ],
        }
        assert _validate_generated_workout(bad, names, cats) is False

    def test_rest_seconds_out_of_range(self):
        names, cats = self._allowed()
        bad = {
            "name": "Push · Chest & Shoulders",
            "duration_min": 60,
            "exercises": [
                {"name": "Barbell Bench Press", "target_sets": 4,
                 "target_reps": "8", "rest_seconds": 500,
                 "starter_weight": 60.0},
            ],
        }
        assert _validate_generated_workout(bad, names, cats) is False

    def test_negative_starter_weight_rejected(self):
        names, cats = self._allowed()
        bad = {
            "name": "Push · Chest & Shoulders",
            "duration_min": 60,
            "exercises": [
                {"name": "Barbell Bench Press", "target_sets": 4,
                 "target_reps": "8", "rest_seconds": 120,
                 "starter_weight": -5.0},
            ],
        }
        assert _validate_generated_workout(bad, names, cats) is False

    def test_zero_exercises_rejected(self):
        names, cats = self._allowed()
        bad = {"name": "Push · Chest & Shoulders",
               "duration_min": 60, "exercises": []}
        assert _validate_generated_workout(bad, names, cats) is False

    def test_missing_keys_rejected(self):
        names, cats = self._allowed()
        assert _validate_generated_workout({}, names, cats) is False
        assert _validate_generated_workout({"name": "Push · Chest & Shoulders"},
                                            names, cats) is False


# ---------- Unit: _pool_after_injuries ----------
class TestInjuryPool:
    def test_no_injury_returns_full_pool(self):
        pool = _pool_after_injuries("")
        # Should have every category from WORKOUT_EXERCISES that has >= 3 exercises
        for cat, exs in WORKOUT_EXERCISES.items():
            if len(exs) >= 3:
                assert cat in pool

    def test_shoulder_injury_strips_overhead(self):
        pool = _pool_after_injuries("mild shoulder impingement, avoid overhead")
        # No exercise named "Overhead Press" should remain anywhere
        for exs in pool.values():
            for ex in exs:
                assert "Overhead Press" not in ex["name"]
                assert "Lateral Raise" not in ex["name"]

    def test_knee_injury_strips_squats(self):
        pool = _pool_after_injuries("recovering from a knee tweak")
        for exs in pool.values():
            for ex in exs:
                # any of the blocked substrings should not appear in the name
                for blocked in INJURY_EXCLUSIONS["knee"]:
                    assert blocked.lower() not in ex["name"].lower(), (
                        f"exercise {ex['name']} slipped past knee filter"
                    )

    def test_multiple_injuries_combine(self):
        pool = _pool_after_injuries("bad shoulder AND knee")
        for exs in pool.values():
            for ex in exs:
                assert "Overhead Press" not in ex["name"]
                assert "Back Squat" not in ex["name"]

    def test_case_insensitive(self):
        low = _pool_after_injuries("shoulder")
        up = _pool_after_injuries("SHOULDER")
        # Same categories should remain
        assert set(low.keys()) == set(up.keys())

    def test_categories_with_too_few_left_are_dropped(self):
        # Endurance categories are small; if we strip everything, they'll be dropped.
        # We hand-craft an injury string that removes at least 2 endurance exercises.
        pool = _pool_after_injuries("ankle and knee and neck")
        # It's fine if the pool shrinks — just make sure remaining categories
        # each still have >= 3 exercises.
        for cat, exs in pool.items():
            assert len(exs) >= 3, f"category {cat} has too few exercises: {len(exs)}"


# ---------- Integration: end-to-end (fallback path exercised, LLM budget may be exhausted) ----------
class TestEndpointsShapePreserved:
    def test_workout_today_shape_still_intact(self, api):
        p = _make_profile(api, {"name": "TEST_shape_ai"})
        r = api.get(f"{BASE_URL}/api/profiles/{p['id']}/workouts/today", timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert "_id" not in j
        # Same shape as pre-AI iteration
        for k in ("profile_id", "workout_name", "weight_unit", "duration_min", "exercises"):
            assert k in j
        assert j["workout_name"] in WORKOUT_EXERCISES  # category name enforced
        assert len(j["exercises"]) > 0

    def test_today_endpoint_returns_exercise_count_not_list(self, api):
        p = _make_profile(api, {"name": "TEST_today_shape"})
        r = api.get(f"{BASE_URL}/api/profiles/{p['id']}/today", timeout=30)
        assert r.status_code == 200
        j = r.json()
        # today_workout.exercises is an INT (count), not a list
        assert isinstance(j["today_workout"]["exercises"], int)
        assert j["today_workout"]["exercises"] > 0

    def test_cache_hit_second_call_fast(self, api):
        """Second call to /workouts/today for the same profile should not
        trigger another LLM roundtrip — the daily plan is cached."""
        import time
        p = _make_profile(api, {"name": "TEST_cache_hit"})
        # First call — may or may not hit the LLM depending on budget
        api.get(f"{BASE_URL}/api/profiles/{p['id']}/workouts/today", timeout=45)
        # Second call — should be a cache hit and fast
        t0 = time.time()
        r = api.get(f"{BASE_URL}/api/profiles/{p['id']}/workouts/today", timeout=10)
        elapsed = time.time() - t0
        assert r.status_code == 200
        assert elapsed < 3.0, f"cache hit took {elapsed:.2f}s (too slow)"

    def test_get_today_and_workout_today_agree_on_name(self, api):
        p = _make_profile(api, {"name": "TEST_endpoint_agree"})
        r1 = api.get(f"{BASE_URL}/api/profiles/{p['id']}/today", timeout=45)
        r2 = api.get(f"{BASE_URL}/api/profiles/{p['id']}/workouts/today", timeout=45)
        assert r1.status_code == r2.status_code == 200
        assert r1.json()["today_workout"]["name"] == r2.json()["workout_name"]

    def test_audit_trail_written(self, api):
        """Every generation attempt — success OR fallback — writes exactly
        one document to generated_plans with the required audit fields.
        Client never sees this collection."""
        import time
        from pymongo import MongoClient
        c = MongoClient('mongodb://localhost:27017')
        db = c['test_database']

        p = _make_profile(api, {"name": "TEST_audit_trail"})
        # Trigger generation
        api.get(f"{BASE_URL}/api/profiles/{p['id']}/workouts/today", timeout=45)
        time.sleep(0.3)

        docs = list(db.generated_plans.find(
            {"profile_id": p["id"]}, {"_id": 0}
        ))
        assert len(docs) == 1, f"expected 1 audit doc, got {len(docs)}"
        d = docs[0]
        for k in ("id", "profile_id", "day_offset", "date", "prompt",
                  "raw_response", "plan", "fallback_used", "created_at"):
            assert k in d, f"audit doc missing {k}"
        # Plan must have the canonical shape regardless of source
        assert "name" in d["plan"]
        assert "duration_min" in d["plan"]
        assert isinstance(d["plan"]["exercises"], list)
        # Plan name must be a valid category
        assert d["plan"]["name"] in WORKOUT_EXERCISES

    def test_injury_profile_excludes_blocked_movements(self, api):
        """A profile with a shoulder injury must never see Overhead Press
        in today's plan, even when the AI is inclined to program it."""
        p = _make_profile(api, {
            "name": "TEST_injury_shoulder",
            "injuries": "left shoulder impingement, no overhead pressing",
        })
        r = api.get(f"{BASE_URL}/api/profiles/{p['id']}/workouts/today", timeout=45)
        assert r.status_code == 200
        j = r.json()
        for ex in j["exercises"]:
            assert "Overhead Press" not in ex["name"], (
                f"blocked exercise slipped through: {ex['name']}"
            )
            assert "Lateral Raise" not in ex["name"]

    def test_no_generated_plans_leak_via_api(self, api):
        """The generated_plans collection must not be exposed anywhere.
        Sanity-check the two workout endpoints don't accidentally include
        prompt/raw_response fields."""
        p = _make_profile(api, {"name": "TEST_no_prompt_leak"})
        r1 = api.get(f"{BASE_URL}/api/profiles/{p['id']}/workouts/today", timeout=45)
        r2 = api.get(f"{BASE_URL}/api/profiles/{p['id']}/today", timeout=45)
        for r in (r1, r2):
            body = r.text.lower()
            assert "raw_response" not in body
            assert "\"prompt\"" not in body
            assert "fallback_used" not in body


# ---------- Unit: _get_or_generate_plan SUCCESS path (mocked LLM) ----------
class TestGetOrGeneratePlanSuccessPath:
    """
    The rest of the suite exercises fallback (LLM unavailable / budget=0).
    This test locks the AI success path: when _generate_workout_for returns
    a valid plan, _get_or_generate_plan must return it AS-IS and record
    fallback_used=False in the audit trail. Regression coverage for the
    NameError-on-allowed_categories bug that landed silently because the
    broad except-clause was swallowing it into the fallback path.
    """

    def test_valid_ai_plan_bypasses_fallback(self, api, monkeypatch):
        from pymongo import MongoClient
        # Import inside the test so we're patching the same module reference
        # server.py uses at call time.
        import server as srv

        # 1) Create a profile — this seeds sessions/logged workouts as usual.
        p = _make_profile(api, {"name": "TEST_ai_success_path"})

        # 2) Purge any generated_plans doc the profile-create flow might
        #    have written (it shouldn't yet — only the /today or
        #    /workouts/today endpoint triggers generation).
        c = MongoClient('mongodb://localhost:27017')
        db = c['test_database']
        db.generated_plans.delete_many({"profile_id": p["id"]})

        # 3) Mock _generate_workout_for to return a valid plan without
        #    touching the network. The plan uses a real category name and
        #    real exercises so validation should pass cleanly.
        canned_plan = {
            "name": "Push · Chest & Shoulders",
            "duration_min": 55,
            "exercises": [
                {"name": "Barbell Bench Press", "target_sets": 4,
                 "target_reps": "6-8", "rest_seconds": 150,
                 "starter_weight": 65.0},
                {"name": "Overhead Press", "target_sets": 3,
                 "target_reps": "8", "rest_seconds": 120,
                 "starter_weight": 40.0},
                {"name": "Incline Dumbbell Press", "target_sets": 3,
                 "target_reps": "10", "rest_seconds": 90,
                 "starter_weight": 22.5},
                {"name": "Triceps Pushdown", "target_sets": 3,
                 "target_reps": "12", "rest_seconds": 60,
                 "starter_weight": 25.0},
            ],
        }

        async def fake_generate(profile, day_offset, recent_logs):
            return {
                "plan": canned_plan,
                "prompt": "TEST_PROMPT",
                "raw_response": "TEST_RAW_RESPONSE",
            }

        # Patch on the module the endpoint imports from.
        monkeypatch.setattr(srv, "_generate_workout_for", fake_generate)

        # We're calling the endpoint against the LIVE server process, which
        # loaded server.py at startup — monkeypatch won't reach it. So we
        # exercise _get_or_generate_plan directly here via asyncio.
        import asyncio
        profile_doc = db.profiles.find_one({"id": p["id"]}, {"_id": 0})
        profile = srv.Profile(**profile_doc)

        result = asyncio.get_event_loop().run_until_complete(
            srv._get_or_generate_plan(profile, day_offset=0)
        )

        # ---- Assertions on the returned plan ----
        assert result["name"] == "Push · Chest & Shoulders", (
            f"expected canned plan name, got {result['name']!r} — "
            "AI success path silently fell back to template"
        )
        assert result["duration_min"] == 55
        assert len(result["exercises"]) == 4
        assert result["exercises"][0]["name"] == "Barbell Bench Press"
        assert result["exercises"][0]["starter_weight"] == 65.0

        # ---- Assertions on the audit trail ----
        docs = list(db.generated_plans.find(
            {"profile_id": p["id"], "day_offset": 0}, {"_id": 0}
        ))
        assert len(docs) == 1, f"expected 1 audit doc, got {len(docs)}"
        d = docs[0]
        assert d["fallback_used"] is False, (
            f"fallback_used should be False on success path; got {d['fallback_used']} "
            f"(validation_error={d.get('validation_error')!r}). This is the exact "
            "regression this test guards against."
        )
        assert d.get("validation_error") is None
        assert d["prompt"] == "TEST_PROMPT"
        assert d["raw_response"] == "TEST_RAW_RESPONSE"
        assert d["plan"] == canned_plan

    def test_invalid_ai_plan_falls_through_to_template(self, api, monkeypatch):
        """The other side of the same guard: if the mocked AI returns a
        plan that fails validation (invented exercise name), we MUST fall
        back to the template AND record validation_error='validation_failed'."""
        from pymongo import MongoClient
        import server as srv
        import asyncio

        p = _make_profile(api, {"name": "TEST_ai_invalid_path"})

        c = MongoClient('mongodb://localhost:27017')
        db = c['test_database']
        db.generated_plans.delete_many({"profile_id": p["id"]})

        bad_plan = {
            "name": "Push · Chest & Shoulders",
            "duration_min": 60,
            "exercises": [
                {"name": "MADE_UP_EXERCISE_XYZ", "target_sets": 4,
                 "target_reps": "8", "rest_seconds": 90,
                 "starter_weight": 40.0},
            ],
        }

        async def fake_generate(profile, day_offset, recent_logs):
            return {"plan": bad_plan, "prompt": "P", "raw_response": "R"}

        monkeypatch.setattr(srv, "_generate_workout_for", fake_generate)

        profile_doc = db.profiles.find_one({"id": p["id"]}, {"_id": 0})
        profile = srv.Profile(**profile_doc)

        result = asyncio.get_event_loop().run_until_complete(
            srv._get_or_generate_plan(profile, day_offset=0)
        )

        # Client-visible plan is NOT the bad plan (it's the template fallback).
        for ex in result["exercises"]:
            assert ex["name"] != "MADE_UP_EXERCISE_XYZ"

        # Audit says fallback and records the failure reason.
        docs = list(db.generated_plans.find(
            {"profile_id": p["id"], "day_offset": 0}, {"_id": 0}
        ))
        assert len(docs) == 1
        assert docs[0]["fallback_used"] is True
        assert docs[0]["validation_error"] == "validation_failed"
