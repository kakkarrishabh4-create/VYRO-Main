# VYRO — Product Requirements Document

## Overview
VYRO is a mobile app for a transformation coach's clients to track workouts and nutrition. Personal, disciplined, human — a training journal, not a control-panel dashboard.

## Delivered Milestones
1. **Design system foundation** — colors / three-family typography / hairline-only elevation / signature `<Thread>`.
2. **Onboarding (5 steps)** — Mifflin-St Jeor macro derivation, stored profile id.
3. **Home screen** — greeting, conditional Brass streak, workout hero, nutrition bar, last-5-days Thread.
4. **Workout detail + inline logging + summary** — expandable SetRows, auto rest timer, Moss/Slate deltas.
5. **Nutrition tracking + add-food flow** — daily summary bar, 4 meal sections with `<Thread>`, sticky search + recents + quantity sheet.
6. **AI-generated workout plans (this iteration — backend only)** — `_pick_workout_for` replaced by a validated LLM path with a robust fallback.

## AI Workout Generation (Iteration 6)

### Behavior
- `GET /profiles/{id}/today` and `GET /profiles/{id}/workouts/today` now serve **AI-generated plans**, cached per `(profile_id, day_offset, date)` so both endpoints share **one LLM call per day**.
- **Model**: OpenAI `gpt-5.4` via `emergentintegrations.llm.chat.LlmChat` (non-streaming `send_message` — we need the complete JSON before validation).
- **Progressive overload**: the last 2–3 `logged_workouts` are formatted into the prompt (exercise names, weights, reps, RPE) with explicit rules — overload on target-RPE≤8 completions, hold or reduce on RPE≥9 or misses.
- **Response shape unchanged** — the frontend needed zero updates.

### Safety layers (in order)
1. **Pre-filter (`_pool_after_injuries`)** — 9 injury keywords → substring block list; matching exercises are stripped BEFORE the pool is shown to the model. Categories with < 3 remaining exercises are dropped entirely.
2. **Prompt instruction** — the model is told to avoid injury-loading exercises even if they slip past filtering.
3. **Post-validation (`_validate_generated_workout`)** — strict schema: `name` must equal one of the category names, `duration_min ∈ [10,180]`, `1 ≤ target_sets ≤ 6`, `target_reps` non-empty string, `0 ≤ rest_seconds ≤ 300`, `starter_weight ≥ 0`, every exercise name in the allowed set derived from the **filtered** pool.
4. **Fallback** — any failure (LLM error, JSON parse error, validation fail) falls through to `_fallback_plan_for`, which uses the deterministic template picker + WORKOUT_EXERCISES + `_convert_weight` scaling. **The injury filter is applied on this path too** so a broken LLM doesn't leak blocked exercises into the client experience. Fallback swaps to an alternate template within the goal if the primary one is shredded by injuries.
5. **Audit trail** — every attempt writes ONE `generated_plans` doc: `{id, profile_id, day_offset, date, prompt, raw_response, plan, fallback_used, validation_error?, created_at}`. Backend-only — verified not to leak via response bodies.

### Improved correctness (added incidentally)
- `get_workout_today` now finds `last_log` **per exercise** across ALL prior logged workouts, not just workouts sharing the current name. Progressive-overload context is preserved when the AI mixes exercises across categories.

### Testing
- 62/62 backend pytest across 4 suites — no regressions in prior iterations.
- New file: `/app/backend/tests/test_ai_workout_generation.py` (22 tests) covers:
  - `_validate_generated_workout`: 9 cases (valid plan / invented exercise / invented workout name / out-of-range sets / empty reps / bad rest / negative weight / zero exercises / missing keys)
  - `_pool_after_injuries`: 6 cases (empty / shoulder / knee / multi-injury / case-insensitive / minimum-category-size)
  - Endpoint integration: 7 cases (shape preserved / today ↔ workout-today agree / cache hit < 3s / audit trail written / injury blocks reach nowhere / no prompt leak)

### Key files
```
/app/backend/server.py                           ← _pool_after_injuries, _validate_generated_workout,
                                                   _generate_workout_for, _fallback_plan_for,
                                                   _get_or_generate_plan; both endpoints wired
/app/backend/.env                                ← EMERGENT_LLM_KEY
/app/backend/tests/test_ai_workout_generation.py ← full AI-path coverage
```

## Next Steps
- Full history timeline page (Thread beyond 5 days)
- Coach chat inbox (natural next use of the same LLM key)
- Weekly / monthly reflection summary
