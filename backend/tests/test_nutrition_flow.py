"""
VYRO Iteration 5 backend tests — nutrition tracking + add food flow.
Covers: /api/foods search, recent foods, meal CRUD, nutrition/today,
today endpoint parity, seed-on-profile-create, _id leaks.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_BACKEND_URL', 'http://localhost:8001').rstrip('/')
API = f"{BASE_URL}/api"


PROFILE_PAYLOAD = {
    "name": "TEST_Nutri User",
    "age": 30,
    "sex": "male",
    "height_cm": 180.0,
    "weight": 80.0,
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
        "calories": 2600, "protein_g": 180, "carbs_g": 280,
        "fat_g": 80, "bmr": 1800, "tdee": 2500,
    },
}


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def profile(api):
    r = api.post(f"{API}/profiles", json=PROFILE_PAYLOAD, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- /api/foods search ----------
class TestFoodSearch:
    def test_empty_query_returns_slice(self, api):
        r = api.get(f"{API}/foods?q=")
        assert r.status_code == 200
        j = r.json()
        assert j["query"] == ""
        assert isinstance(j["results"], list)
        assert len(j["results"]) > 0
        f = j["results"][0]
        for k in ["id", "name", "portion", "calories", "protein_g", "carbs_g", "fat_g"]:
            assert k in f, f"missing {k}"
        assert "_id" not in f

    def test_limit_respected(self, api):
        r = api.get(f"{API}/foods?q=&limit=5")
        assert r.status_code == 200
        assert len(r.json()["results"]) == 5

    def test_chick_matches_chicken(self, api):
        r = api.get(f"{API}/foods?q=chick")
        assert r.status_code == 200
        names = [x["name"] for x in r.json()["results"]]
        assert any("Chicken breast" in n for n in names), names
        assert any("Chicken thigh" in n for n in names), names

    def test_food_ids_stable(self, api):
        r = api.get(f"{API}/foods?q=chicken breast")
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()["results"]]
        assert "f-001" in ids


# ---------- Recent foods ----------
class TestRecentFoods:
    def test_unknown_profile_404(self, api):
        r = api.get(f"{API}/profiles/does-not-exist-abc/foods/recent")
        assert r.status_code == 404

    def test_recent_populated_from_seed(self, api, profile):
        r = api.get(f"{API}/profiles/{profile['id']}/foods/recent")
        assert r.status_code == 200
        j = r.json()
        assert j["profile_id"] == profile["id"]
        assert isinstance(j["recent"], list)
        assert len(j["recent"]) > 0, "seed should have produced recents"
        item = j["recent"][0]
        assert "food" in item and "last_used" in item and "log_count" in item
        assert "_id" not in item
        assert "_id" not in item["food"]

    def test_recent_sorted_desc(self, api, profile):
        r = api.get(f"{API}/profiles/{profile['id']}/foods/recent")
        j = r.json()
        lu = [x["last_used"] for x in j["recent"]]
        assert lu == sorted(lu, reverse=True)


# ---------- POST /meals ----------
class TestLogMeal:
    def test_log_meal_computes_macros(self, api, profile):
        payload = {"food_id": "f-001", "meal_type": "lunch", "servings": 1.5}
        r = api.post(f"{API}/profiles/{profile['id']}/meals", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        # 165 kcal/serving * 1.5 = 247.5 → 247.5 (backend rounds to 1 dp)
        assert j["calories"] == pytest.approx(247.5, rel=0.01)
        assert j["protein_g"] == pytest.approx(31.0 * 1.5, rel=0.01)
        assert j["food_id"] == "f-001"
        assert j["meal_type"] == "lunch"
        assert j["servings"] == 1.5
        assert "_id" not in j
        # persist id for delete
        pytest.shared_meal_id = j["id"]

    def test_invalid_food_id_404(self, api, profile):
        r = api.post(
            f"{API}/profiles/{profile['id']}/meals",
            json={"food_id": "f-999999", "meal_type": "lunch", "servings": 1},
        )
        assert r.status_code == 404

    def test_unknown_profile_404(self, api):
        r = api.post(
            f"{API}/profiles/unknown-x/meals",
            json={"food_id": "f-001", "meal_type": "lunch", "servings": 1},
        )
        assert r.status_code == 404

    def test_servings_zero_rejected(self, api, profile):
        r = api.post(
            f"{API}/profiles/{profile['id']}/meals",
            json={"food_id": "f-001", "meal_type": "lunch", "servings": 0},
        )
        assert r.status_code == 422

    def test_servings_too_large_rejected(self, api, profile):
        r = api.post(
            f"{API}/profiles/{profile['id']}/meals",
            json={"food_id": "f-001", "meal_type": "lunch", "servings": 25},
        )
        assert r.status_code == 422


# ---------- DELETE meal ----------
class TestDeleteMeal:
    def test_delete_existing(self, api, profile):
        # create fresh one
        r = api.post(
            f"{API}/profiles/{profile['id']}/meals",
            json={"food_id": "f-002", "meal_type": "dinner", "servings": 1},
        )
        mid = r.json()["id"]
        d = api.delete(f"{API}/profiles/{profile['id']}/meals/{mid}")
        assert d.status_code == 200
        assert d.json() == {"ok": True, "id": mid}

    def test_delete_unknown_404(self, api, profile):
        d = api.delete(f"{API}/profiles/{profile['id']}/meals/not-a-real-id")
        assert d.status_code == 404


# ---------- Nutrition/today grouping + parity ----------
class TestNutritionToday:
    def test_all_four_meal_types_in_order(self, api, profile):
        r = api.get(f"{API}/profiles/{profile['id']}/nutrition/today")
        assert r.status_code == 200
        j = r.json()
        types = [m["meal_type"] for m in j["meals"]]
        assert types == ["breakfast", "lunch", "dinner", "snack"]
        assert "_id" not in j
        for m in j["meals"]:
            assert "_id" not in m
            for e in m["entries"]:
                assert "_id" not in e

    def test_subtotals_match_entries(self, api, profile):
        r = api.get(f"{API}/profiles/{profile['id']}/nutrition/today")
        j = r.json()
        for m in j["meals"]:
            expected = int(round(sum(e["calories"] for e in m["entries"])))
            assert m["subtotal_calories"] == expected

    def test_home_and_nutrition_agree(self, api, profile):
        h = api.get(f"{API}/profiles/{profile['id']}/today").json()
        n = api.get(f"{API}/profiles/{profile['id']}/nutrition/today").json()
        assert (
            h["today_nutrition"]["calories_consumed"]
            == n["nutrition"]["calories_consumed"]
        )
        assert (
            h["today_nutrition"]["protein_consumed"]
            == n["nutrition"]["protein_consumed"]
        )

    def test_seed_meals_present_for_fresh_profile(self, api):
        r = api.post(f"{API}/profiles", json=PROFILE_PAYLOAD, timeout=15)
        pid = r.json()["id"]
        n = api.get(f"{API}/profiles/{pid}/nutrition/today").json()
        # breakfast should have entries from seed
        bfast = next(m for m in n["meals"] if m["meal_type"] == "breakfast")
        assert len(bfast["entries"]) > 0, "seed should produce breakfast entries"
        assert n["nutrition"]["calories_consumed"] > 0

    def test_unknown_profile_404(self, api):
        r = api.get(f"{API}/profiles/no-such-id/nutrition/today")
        assert r.status_code == 404
