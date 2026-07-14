# VYRO — Product Requirements Document

## Overview
VYRO is a mobile app for a transformation coach's clients to track workouts and nutrition. Personal, disciplined, human — the mobile equivalent of a well-kept training journal.

## Delivered Milestones

### 1. Design System Foundation
Colors (Ink / Bone / Moss / Brass / Slate), three-family typography (Fraunces / Inter / IBM Plex Mono), 8pt spacing, 8px radius, hairline-only elevation, signature `<Thread>` line, Feather line-icon lock. Source: `/app/design_guidelines.json` + `/app/frontend/src/theme/`.

### 2. Onboarding Flow (5 steps)
Wizard collects basic info → goal → lifestyle → training background, then computes daily calorie & macro targets via Mifflin-St Jeor, POSTs to `/api/profiles`, and stores the profile id in AsyncStorage under `vyro.profile.id`.

### 3. Client Home Screen
Route `/home`. Journal layout: greeting + date, conditional Brass streak badge (≥3), today's workout hero with Moss "Start workout", compact horizontal nutrition bar, and last-5-days `<Thread>`.

### 4. Workout Detail + Inline Logging + Summary (this iteration)

**Route `/workout/today`**
- Header: `Today's session` label + workout name in Fraunces + exercises count + duration.
- **Exercise list** — ordered as they'll be performed. Each row:
  - Exercise name (Fraunces h3)
  - `<target_sets> × <target_reps>` (Plex Mono)
  - `Last time · <mono numbers>` directly beneath (from most recent same-name log; `—` if none)
- **Inline expansion** — tap an exercise header → `LayoutAnimation.easeInEaseOut` reveals the `SetRow` list (NOT a route change).
- **SetRow** — one per set. Contains `Weight (kg|lb)` NumberStepper (step 2.5 kg / 5 lb), `Reps` NumberStepper, RPE 1–10 dot selector (optional, tap same value to clear), and a subtle Moss check button. **Completing a set changes ONLY the check button's fill/border** — the rest of the row does not shift color, per brief.
- **Add set** secondary button appends a new set (weight/reps prefilled from last set).
- **Rest timer** — mounts as a bottom overlay the moment a set is checked; mono `M:SS` countdown starting from that exercise's `rest_seconds` (e.g. 2:30 for bench). `+15s` extends, `Skip` dismisses. Un-completing does NOT re-trigger.
- **Totals band + Finish** — live "Sets completed" and "Volume" in Plex Mono; `Finish workout` disabled while 0 sets are completed.

**Route `/workout/summary`**
- Reads from AsyncStorage `vyro.workout.lastSummary`.
- Fraunces workout name + `SESSION LOGGED` label + Moss check icon in the corner.
- `TOTAL VOLUME` — Plex Mono large number + weight unit + comparison delta.
- `SETS COMPLETED` — same treatment.
- **Delta indicators** — arrow-up **Moss** for improvement, arrow-down **Slate** for regression, minus **Slate** for flat, `First time` label when no prior data. **Never red/green** — the palette stays consistent.
- Breakdown per exercise: name + `<n> sets` + volume.
- `Back to today` returns to `/home`.

### Backend (this iteration)
- `GET /api/profiles/{id}/workouts/today` → `WorkoutDetail{workout_name, weight_unit, duration_min, exercises[{id, name, target_sets, target_reps, rest_seconds, starter_weight, last_log?}]}`. Uses `WORKOUT_EXERCISES` template map keyed by workout name; last-log context comes from the most recent same-name `logged_workouts` doc.
- `POST /api/profiles/{id}/workouts/complete` → persists `LoggedWorkout`, upserts today's `sessions` row to `workout`, and returns `WorkoutCompleteResponse` with total volume, sets completed, per-exercise breakdown, and comparison deltas (`volume_delta_pct`, `sets_delta`) against the previous same-name workout.
- Profile creation now also seeds one prior logged workout per unique workout name in the recent session history — so the "Last time" line has real numbers from day one.
- **Bug regression covered**: target-rep parsing takes only the first digit run so `"6-8"` → 6 (never 68).

### Verified (Iteration 4)
- 11/11 pytest suite `/app/backend/tests/test_vyro_workout.py`
- Full Playwright flow: expand → set values → check → rest timer with skip/+15s → un-check does NOT re-trigger → finish → summary with slate down-arrow (91.6% regression vs seeded) → back to home
- No `_id` leakage; no red/green anywhere in the summary flow

## New Primitives Added This Iteration
`/app/frontend/src/components/`
- `NumberStepper` — large tappable +/− with mono readout
- `RPESelector` — 10-dot row, color-only selection
- `RestTimer` — bottom overlay countdown with +15s / Skip
- `SetRow` — set state row (weight + reps + RPE + subtle check)
- `ExerciseRow` — collapsed context + inline expansion

## Files
```
/app/backend/server.py                          ← /workouts/today, /workouts/complete, seed prior log
/app/frontend/app/workout/today.tsx             ← detail + inline logging + rest timer
/app/frontend/app/workout/summary.tsx           ← end-of-workout summary with Moss/Slate deltas
/app/frontend/src/components/{NumberStepper,RPESelector,RestTimer,SetRow,ExerciseRow}.tsx
```

## Next Steps
- Meal-logging bottom sheet flowing into `NutritionBar`
- History timeline (full page — `<Thread>` beyond 5 days)
- Coach chat inbox
- Weekly / monthly reflection summaries
