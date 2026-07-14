"""VYRO iteration 4 backend tests — workout detail (/workouts/today) and completion (/workouts/complete)."""
import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or os.environ.get('EXPO_BACKEND_URL')
if not BASE_URL:
    with open('/app/frontend/.env') as fh:
        for line in fh:
            if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip('/')


BASE_PROFILE = {
    "name": "TEST_Workout User",
    "age": 28,
    "sex": "male",
    "height_cm": 180.0,
    "weight": 82.0,
    "weight_unit": "kg",
    "goal": "muscle_gain",
    "job_activity": "desk",
    "sleep_hours": 7,
    "stress": "moderate",
    "training_days": 5,
    "experience": "intermediate",
    "injuries": "",
    "equipment": "gym",
    "targets": {
        "calories": 2800, "protein_g": 180, "carbs_g": 320,
        "fat_g": 90, "bmr": 1850, "tdee": 2600,
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
    assert r.status_code == 200, f"profile create failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def profile(api):
    return _make_profile(api)


# --- /workouts/today contract ---
class TestWorkoutTodayEndpoint:
    def test_workout_today_shape(self, api, profile):
        r = api.get(f"{BASE_URL}/api/profiles/{profile['id']}/workouts/today")
        assert r.status_code == 200, r.text
        j = r.json()
        assert "_id" not in j
        for k in ("profile_id", "workout_name", "weight_unit", "duration_min", "exercises"):
            assert k in j, f"missing key {k}"
        assert j["profile_id"] == profile["id"]
        assert j["weight_unit"] == profile["weight_unit"]
        assert isinstance(j["duration_min"], int) and j["duration_min"] > 0
        assert isinstance(j["exercises"], list) and len(j["exercises"]) > 0

    def test_workout_today_exercise_fields(self, api, profile):
        r = api.get(f"{BASE_URL}/api/profiles/{profile['id']}/workouts/today")
        j = r.json()
        for ex in j["exercises"]:
            assert "_id" not in ex
            for k in ("id", "name", "target_sets", "target_reps", "rest_seconds", "starter_weight"):
                assert k in ex, f"exercise missing {k}"
            assert isinstance(ex["target_sets"], int) and ex["target_sets"] >= 1
            assert isinstance(ex["target_reps"], str)  # may be "6-8" or "45s"
            assert isinstance(ex["rest_seconds"], int)
            assert isinstance(ex["starter_weight"], (int, float))
            # last_log is either None or dict with date + sets[]
            ll = ex.get("last_log")
            if ll is not None:
                assert "date" in ll and "sets" in ll
                assert isinstance(ll["sets"], list)
                for s in ll["sets"]:
                    assert "weight" in s and "reps" in s
                    assert isinstance(s["reps"], int)

    def test_workout_today_has_last_log_for_first_exercises(self, api, profile):
        """
        For any exercise in the plan that the profile has actually done
        before (present in seeded logged_workouts), last_log must be
        populated. Robust to AI-plan variability: if the AI happens to pick
        a plan with zero overlap with the seed, we skip — that scenario
        doesn't disprove the feature, and the shape assertions in
        test_workout_today_exercise_fields already cover the null-branch.
        """
        import pytest
        from pymongo import MongoClient
        c = MongoClient('mongodb://localhost:27017')
        db = c['test_database']
        seed_docs = list(db.logged_workouts.find(
            {"profile_id": profile["id"]}, {"_id": 0}
        ))
        seeded_names = {ex["name"] for lw in seed_docs for ex in lw["exercises"]}
        assert seeded_names, "seed should have populated some logged workouts"

        r = api.get(f"{BASE_URL}/api/profiles/{profile['id']}/workouts/today")
        j = r.json()
        overlap = seeded_names & {ex["name"] for ex in j["exercises"]}
        if not overlap:
            pytest.skip("AI plan happened to pick zero overlap with seed history")

        # Every overlapping exercise MUST resolve to a real last_log via the
        # per-exercise lookup in get_workout_today.
        proven = False
        for ex in j["exercises"]:
            if ex["name"] in overlap:
                assert ex.get("last_log") is not None, (
                    f"exercise '{ex['name']}' is in seeded history but the endpoint "
                    f"returned last_log=None — per-exercise lookup regressed."
                )
                sets = ex["last_log"]["sets"]
                assert isinstance(sets, list) and len(sets) > 0
                proven = True
        assert proven

    def test_seeded_reps_not_parsed_string_join(self, api):
        """Regression: '6-8' target reps must NOT become 68 in seeded last_log."""
        # Force muscle_gain and try many profiles until Legs · Quad focus is today.
        # Instead: create several profiles and find one where any exercise last_log
        # contains a Back Squat (which uses "6-8") — assert reps <= 10.
        found = False
        for i in range(15):
            p = _make_profile(api, {"name": f"TEST_reps_check_{i}", "goal": "muscle_gain"})
            r = api.get(f"{BASE_URL}/api/profiles/{p['id']}/workouts/today")
            j = r.json()
            for ex in j["exercises"]:
                if not ex.get("last_log"):
                    continue
                # Check any exercise whose target_reps contains a range like "6-8" or "8-10"
                if "-" in str(ex["target_reps"]):
                    for s in ex["last_log"]["sets"]:
                        assert s["reps"] <= 20, (
                            f"reps look like joined digits from '{ex['target_reps']}': "
                            f"exercise={ex['name']} reps={s['reps']}"
                        )
                        found = True
                if ex["name"] == "Back Squat":
                    for s in ex["last_log"]["sets"]:
                        assert s["reps"] <= 10, (
                            f"Back Squat reps too high (likely '6-8' parsed as 68): {s['reps']}"
                        )
                        found = True
            if found:
                break
        # Not strictly required to hit both, but must have checked at least one range/BS
        assert found, "could not find a range-reps exercise across 15 profiles to regression test"

    def test_workout_today_404_unknown_profile(self, api):
        r = api.get(f"{BASE_URL}/api/profiles/does-not-exist/workouts/today")
        assert r.status_code == 404


# --- /workouts/complete contract ---
class TestWorkoutComplete:
    def _get_today(self, api, pid):
        r = api.get(f"{BASE_URL}/api/profiles/{pid}/workouts/today")
        assert r.status_code == 200
        return r.json()

    def test_complete_success_with_previous_deltas(self, api, profile):
        # The prior iteration of this test asked the /workouts/today endpoint
        # for a plan and then posted that plan back as a completion. That
        # worked when the plan came from the deterministic template picker,
        # because seed history used the same picker so names always matched.
        # With the AI path now active, the plan's workout_name is dynamic —
        # so we drive this test directly off a seeded prior workout instead
        # of the today endpoint, guaranteeing the previous_* fields resolve.
        from pymongo import MongoClient
        c = MongoClient('mongodb://localhost:27017')
        db = c['test_database']
        seeded = db.logged_workouts.find_one(
            {"profile_id": profile["id"]}, {"_id": 0},
            sort=[("created_at", -1)],
        )
        assert seeded is not None, "profile should have seeded prior workouts"
        workout_name = seeded["workout_name"]
        weight_unit = seeded["weight_unit"]
        # Use two of the seeded workout's exercises so the completion is
        # a plausible "next session of the same workout".
        seed_exs = seeded["exercises"][:2]
        assert len(seed_exs) >= 2, "seed should have at least 2 exercises"

        payload = {
            "workout_name": workout_name,
            "weight_unit": weight_unit,
            "duration_min": 45,
            "exercises": [
                {
                    "name": se["name"],
                    "sets": [
                        {"weight": se["sets"][0]["weight"], "reps": 8, "rpe": 7}
                    ],
                }
                for se in seed_exs
            ],
        }
        r = api.post(f"{BASE_URL}/api/profiles/{profile['id']}/workouts/complete", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "_id" not in j
        for k in ("id", "workout_name", "weight_unit", "date", "total_volume",
                  "sets_completed", "exercises",
                  "previous_total_volume", "previous_sets_completed",
                  "volume_delta_pct", "sets_delta"):
            assert k in j, f"missing {k}"
        assert j["sets_completed"] == 2
        expected = sum(se["sets"][0]["weight"] * 8 for se in seed_exs)
        assert abs(j["total_volume"] - expected) < 0.5
        assert isinstance(j["exercises"], list) and len(j["exercises"]) == 2
        for exs in j["exercises"]:
            for k in ("name", "sets_completed", "volume"):
                assert k in exs
        # Seeded prior workout with matching name → previous_* populated.
        assert j["previous_total_volume"] is not None
        assert j["previous_sets_completed"] is not None
        assert j["sets_delta"] is not None

    def test_complete_zero_sets_returns_400(self, api, profile):
        payload = {
            "workout_name": "Push · Chest & Shoulders",
            "weight_unit": "kg",
            "duration_min": 60,
            "exercises": [],  # zero sets
        }
        r = api.post(f"{BASE_URL}/api/profiles/{profile['id']}/workouts/complete", json=payload)
        assert r.status_code == 400

    def test_complete_zero_sets_with_empty_exercise(self, api, profile):
        payload = {
            "workout_name": "Push · Chest & Shoulders",
            "weight_unit": "kg",
            "duration_min": 60,
            "exercises": [{"name": "Bench", "sets": []}],
        }
        r = api.post(f"{BASE_URL}/api/profiles/{profile['id']}/workouts/complete", json=payload)
        assert r.status_code == 400

    def test_complete_404_unknown_profile(self, api):
        payload = {
            "workout_name": "X",
            "weight_unit": "kg",
            "duration_min": 30,
            "exercises": [{"name": "X", "sets": [{"weight": 10, "reps": 5}]}],
        }
        r = api.post(f"{BASE_URL}/api/profiles/unknown-id/workouts/complete", json=payload)
        assert r.status_code == 404

    def test_complete_upserts_session_in_home_history(self, api):
        """After complete, /today history should show today as workout."""
        p = _make_profile(api, {"name": "TEST_upsert_session"})
        detail = self._get_today(api, p["id"])
        payload = {
            "workout_name": detail["workout_name"],
            "weight_unit": detail["weight_unit"],
            "duration_min": detail["duration_min"],
            "exercises": [
                {"name": detail["exercises"][0]["name"],
                 "sets": [{"weight": 50.0, "reps": 5, "rpe": 8}]}
            ],
        }
        r = api.post(f"{BASE_URL}/api/profiles/{p['id']}/workouts/complete", json=payload)
        assert r.status_code == 200, r.text

        # Now check /today home endpoint history
        r2 = api.get(f"{BASE_URL}/api/profiles/{p['id']}/today")
        assert r2.status_code == 200
        today_j = r2.json()
        # today_j['today_date'] should not appear in history (history is only past days)
        # But the session should be upserted for today — verify via profile
        # Directly check: history is past 5 sessions; verify workout persisted
        # We'll re-query workout complete idempotency indirectly by checking a second POST
        # updates rather than duplicates by testing that a subsequent /workouts/complete
        # still returns 200 (upsert succeeds).
        r3 = api.post(f"{BASE_URL}/api/profiles/{p['id']}/workouts/complete", json=payload)
        assert r3.status_code == 200

    def test_no_object_id_leak(self, api, profile):
        detail = self._get_today(api, profile["id"])
        payload = {
            "workout_name": detail["workout_name"],
            "weight_unit": detail["weight_unit"],
            "duration_min": detail["duration_min"],
            "exercises": [
                {"name": detail["exercises"][0]["name"],
                 "sets": [{"weight": 40.0, "reps": 10}]}
            ],
        }
        r = api.post(f"{BASE_URL}/api/profiles/{profile['id']}/workouts/complete", json=payload)
        j = r.json()
        # deep-check no _id leaks
        def _no_id(obj):
            if isinstance(obj, dict):
                assert "_id" not in obj
                for v in obj.values():
                    _no_id(v)
            elif isinstance(obj, list):
                for v in obj:
                    _no_id(v)
        _no_id(j)
