# VYRO — Product Requirements Document

## Overview
VYRO is a mobile app for a transformation coach's clients to track workouts and nutrition. Personal, disciplined, human — the mobile equivalent of a well-kept training journal.

## Delivered Milestones

### 1. Design System Foundation
Colors, three-family typography (Fraunces / Inter / IBM Plex Mono), 8pt spacing, 8px radius, hairline-only elevation, `<Thread>` signature line, Feather line-icon lock. Source of truth: `/app/design_guidelines.json` + `/app/frontend/src/theme/`.

### 2. Onboarding Flow (5 steps)
Multi-step wizard collecting basic info / goal / lifestyle / training background, then computing daily calorie & macro targets via Mifflin-St Jeor. Persists to backend and stores profile id in AsyncStorage under `vyro.profile.id`.

### 3. Client Home Screen (this iteration)
Route: `/home?profileId=<id>` (also resolves via AsyncStorage on cold start). Journal layout, top to bottom:

1. **Greeting** — `Weekday, Month D` label in Slate + `Morning, <first-name>.` in Fraunces
2. **Streak badge** — Brass, `<Zap>` icon + `Nd day streak`, rendered ONLY when streak ≥ 3
3. **Today's workout hero** — `TODAY'S SESSION` label + workout name (Fraunces h1) + `<n> exercises · <m> min` meta + full-width Moss "Start workout" button
4. **Compact nutrition bar** — `TODAY'S FUEL` + `consumed / target kcal` (IBM Plex Mono) + remaining + main Moss track + 3 slim macro tracks (protein / carbs / fat) with mono numbers
5. **Last-5-days thread** — `LAST 5 DAYS` label + `<Thread>` with 5 `<ThreadEntry>` rows: day label + date + workout name / "Rest day" / "Missed" + check / moon / x icon in the corresponding tone

**Additional plumbing**
- `/` (welcome) — auto-redirects to `/home` if a profile id is in storage; otherwise shows onboarding CTA
- `/workout/today` — placeholder detail page reached from the Start button; will host set-by-set logging next
- Pull-to-refresh on home, plus explicit empty (`home-empty`) and error (`home-error`) states with retry

### Backend
- `POST /api/profiles` — validates, stores profile, **seeds 5 recent days** of `sessions` (workout / rest / missed distribution derived from `training_days`, deterministic per profile id)
- `GET /api/profiles/{id}` — profile fetch
- `GET /api/profiles/{id}/today` — returns:
  ```
  {profile_id, name, today_date,
   today_workout {name, exercises, duration_min},
   today_nutrition {calories_consumed/target, protein_consumed/target,
                    carbs_consumed/target, fat_consumed/target},
   streak, history[]}
  ```
- Today's workout picked deterministically from a per-goal template pool
- Nutrition consumed: seeded partial day (30–65% of target) until meal logging lands
- Streak logic: `workout` + `rest` count as active; `missed` breaks the streak
- All Mongo responses project out `_id`

## Reusable Primitives Added This Iteration
`/app/frontend/src/components/`
- `WorkoutHero` — journal-feel hero (no card border)
- `NutritionBar` — compact calorie row + 3 slim macro tracks
- `StreakBadge` — Brass, self-hiding under threshold
- `HistoryThread` — the Thread applied to N days of activity with day/date/status rows

## Verified (Iteration 3)
- 10/10 pytest backend suite in `/app/backend/tests/test_vyro_today.py`
- Frontend Playwright walk-through of home + workout + empty + error states
- StreakBadge threshold behavior confirmed
- No `_id` leakage anywhere

## Files
```
/app/backend/server.py                         ← + /today endpoint, session seeding
/app/frontend/app/index.tsx                    ← auto-redirect welcome
/app/frontend/app/home.tsx                     ← client home (this iteration)
/app/frontend/app/workout/today.tsx            ← placeholder detail
/app/frontend/app/onboarding/…                 ← unchanged from iteration 2
/app/frontend/src/components/
  ├─ WorkoutHero.tsx
  ├─ NutritionBar.tsx
  ├─ StreakBadge.tsx
  ├─ HistoryThread.tsx
  └─ …previous primitives
/app/frontend/src/context/OnboardingContext.tsx
/app/frontend/src/theme/                        ← tokens
```

## Next Steps
- Real meal-log screen (bottom sheet, mono macro totals rolling up into `NutritionBar`)
- Set-by-set workout logger replacing `/workout/today` placeholder
- History timeline (full page, using `<Thread>` beyond 5 days)
- Coach chat inbox
- Weekly / monthly reflection summaries
