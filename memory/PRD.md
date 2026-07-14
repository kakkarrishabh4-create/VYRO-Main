# VYRO — Product Requirements Document

## Overview
VYRO is a mobile app for a transformation coach's clients to track workouts and nutrition. Personal, disciplined, human — a training journal, not a control-panel dashboard.

## Delivered Milestones

### 1. Design System Foundation
Colors (Ink / Bone / Moss / Brass / Slate), three-family typography (Fraunces / Inter / IBM Plex Mono), 8pt spacing, 8px radius, hairline-only elevation, signature `<Thread>` line, Feather line-icon lock.

### 2. Onboarding (5 steps)
Basic info → goal → lifestyle → training background → target-summary. Mifflin-St Jeor macro derivation. Stores `vyro.profile.id` in AsyncStorage.

### 3. Home Screen
Route `/home`. Greeting + conditional Brass streak, today's workout hero, compact nutrition bar, last-5-days `<Thread>`. NutritionBar now tappable → `/nutrition`.

### 4. Workout Detail + Inline Logging + Summary
Route `/workout/today` and `/workout/summary`. Inline SetRow expansion, subtle Moss check, auto rest-timer with Skip/+15s, end summary with Moss/Slate deltas (never red/green).

### 5. Nutrition Tracking + Add Food Flow (this iteration)

**Route `/nutrition`**
- Top: `NutritionBar` — calories consumed vs target + thin Moss macro tracks (protein / carbs / fat), all numbers Plex Mono, remaining kcal on the right.
- Below: four ordered `MealSection`s — Breakfast, Lunch, Dinner, Snacks.
- Each section: label + subtotal kcal → `<Thread>` of `ThreadEntry`s (or a quiet `—` when empty) → inline "+ Add" (Moss tertiary) → tap surfaces `/nutrition/add?meal_type=<type>`.
- Every entry: food name (Inter medium) + `[servings ×] portion` (Slate caption) + calories (Plex Mono).
- Refreshes on focus (returning from the Add flow).

**Route `/nutrition/add?meal_type=…`**
- Sticky top: back arrow + `Add food` title + `SearchField` (auto-focus, `x` clear, search icon).
- `Recent & favorites` section (`recent-section`) surfaces the user's recent foods when the query is empty — repeat logging becomes two taps.
- Below: results list (`All foods` when empty, `Matches` when searching, `results-empty` message otherwise). Debounced 220ms.
- `FoodRow` — name + portion + calories per serving, whole row tappable.
- Tap opens `QuantitySheet` (native Modal, slides from bottom):
  - servings `NumberStepper` (step 0.5, min 0.25, max 20)
  - live macro preview — `kcal | P g | C g | F g` — recomputes on every tap
  - meal-type pill row (Breakfast / Lunch / Dinner / Snack) with URL param pre-selected, else time-of-day default
  - `Add to log` primary → `POST /meals` → back to `/nutrition` (or replace fallback)

### Backend (this iteration)
- **`FOOD_CATALOG`** — 70 hand-curated items with per-portion macros.
- **`logged_meals`** collection + `MealEntry` model.
- `GET /api/foods?q=&limit=` — score-based search (exact > prefix > word > substring).
- `GET /api/profiles/{id}/foods/recent?limit=` — aggregated by `food_id`, sorted by most recent, `log_count` acts as a favorite proxy.
- `POST /api/profiles/{id}/meals` — validates `servings ∈ (0, 20]`, 404 on bad food/profile, computes and stores calories/protein/carbs/fat.
- `DELETE /api/profiles/{id}/meals/{meal_id}` — 200 + `{ok, id}`, 404 on miss.
- `GET /api/profiles/{id}/nutrition/today` — real daily summary from logged meals + `MealGroup[]` in fixed breakfast/lunch/dinner/snack order (empty groups included).
- **Home parity**: `/api/profiles/{id}/today` now also derives `today_nutrition` from real logged meals (random mock removed).
- **Seed on profile create**: adds a handful of breakfast entries + occasional snack for the current day so first launch has real numbers on home + nutrition.
- All responses project out `_id`.

### Verified (Iteration 5)
- 19/19 backend pytest in `/app/backend/tests/test_nutrition_flow.py` (search, recents, POST/DELETE meals, servings math, nutrition/today grouping, home parity, seed correctness, no `_id` leaks).
- Full Playwright walk: home → nutrition → tap Lunch Add → search "chick" → tap `Chicken breast, grilled` → 1.5 servings previews **248 kcal** → confirm → back to `/nutrition` shows the new entry under Lunch, totals update accordingly.
- Bug found + fixed inline: missing `Pressable` import in `home.tsx` after the nutrition tap-area addition.

## Primitives Added This Iteration
`/app/frontend/src/components/`
- `MealSection` — meal-type block with `<Thread>` + inline Add
- `FoodRow` — name/portion/kcal, one-tap
- `SearchField` — 44pt sticky, `x` clear
- `QuantitySheet` — bottom-sheet Modal with servings stepper + live preview + meal-type pills

## Files
```
/app/backend/server.py                           ← foods, meals, nutrition/today, seed
/app/frontend/app/nutrition/index.tsx            ← main nutrition screen
/app/frontend/app/nutrition/add.tsx              ← Add food flow
/app/frontend/app/home.tsx                       ← NutritionBar now tappable, focus-refresh
/app/frontend/src/components/{MealSection,FoodRow,SearchField,QuantitySheet}.tsx
```

## Next Steps
- Full history timeline page (Thread beyond 5 days), tap an entry → see that session
- Coach chat inbox
- Weekly / monthly reflection summary
- Barcode / photo food logging (would replace the search-only path)
