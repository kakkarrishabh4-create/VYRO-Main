# VYRO — Product Requirements Document

## Overview
VYRO is a mobile app for a transformation coach's clients to track workouts and nutrition. Personal, disciplined, human — the mobile equivalent of a well-kept training journal.

## Delivered Milestones

### 1. Design System Foundation
Full visual foundation — colors, three-family typography (Fraunces / Inter / IBM Plex Mono), 8pt spacing, 8px radius, hairline-only elevation, signature `<Thread>` line, Feather line-icon lock. See `/app/design_guidelines.json` and `/app/frontend/src/theme/`.

### 2. Onboarding Flow (5 steps)
Multi-screen wizard that intakes new-client data and derives daily calorie + macro targets client-side, then persists to backend.

**Routes**
- `/` — Welcome ("Start my onboarding" → `/onboarding`)
- `/onboarding` → redirects to `/onboarding/step-1`
- `/onboarding/step-1` — Name, age, sex, height, weight + kg/lb toggle
- `/onboarding/step-2` — Goal single-select cards (Fat Loss / Muscle Gain / Recomp / General / Endurance)
- `/onboarding/step-3` — Job activity, sleep stepper, stress, training-days stepper
- `/onboarding/step-4` — Experience, injuries (multiline), equipment access
- `/onboarding/step-5` — Calorie + macro targets summary + confirm
- `/home` — Post-onboarding landing (temporary)

**Shared state** via `OnboardingProvider` React Context.
**Progress indicator** — 5 thin dashes at the top of every step, Moss for completed / current.
**Persistent Back** — `<StepHeader>` on steps 2–5 (step 1 has no back — it's the first).
**Continue buttons** — always disabled until required fields are filled/selected.

**Calorie & macro derivation**
- BMR: Mifflin-St Jeor
- TDEE multiplier: 1.2 (desk) / 1.4 (active) / 1.55 (manual) + 0.03 × training days
- Goal calorie adjustments: fat-loss −20%, muscle +10%, recomp −5%, general 0%, endurance +5%
- Macro splits (P/C/F % of kcal): fat_loss 40/30/30, muscle 30/45/25, recomp 35/40/25, general 25/50/25, endurance 20/60/20

**Backend**
- `POST /api/profiles` — validates payload (age 13–100, height 80–260 cm, weight > 20, enum sex/goal/etc.), stores in MongoDB `profiles` collection, returns full profile with UUID `id`. `_id` is stripped from all responses via projection.
- `GET /api/profiles/{id}` — 404 if not found, otherwise returns the profile.
- `GET /api/profiles` — list, newest first.

**Manually verified end-to-end (Playwright)**
- Full flow: fill step 1 → step 5 → confirm → land on `/home` with "Welcome, Alex." greeting
- Progress dashes light correctly per step
- Back button (`step-back-button`) exists on step 2+
- Invalid backend payload (age = 12) → HTTP 422
- Response contains `id` and no `_id`

## Reusable Primitives (added this iteration)
`/app/frontend/src/components/`
- `ProgressIndicator` — n-of-total top dash row
- `OptionCard` — large tappable select tile
- `TextField` — Inter/mono input with hairline border + focus-Moss + suffix
- `UnitToggle<T>` — 2-value segmented control (used for kg/lb)
- `Stepper` — minus/plus numeric with mono readout
- `StepHeader` — persistent back + Fraunces headline + Inter subhead

## Files
```
/app/backend/server.py                        ← POST/GET /api/profiles
/app/frontend/app/index.tsx                   ← welcome
/app/frontend/app/home.tsx                    ← post-onboarding landing
/app/frontend/app/onboarding/
  ├── _layout.tsx                              ← <OnboardingProvider> + Stack
  ├── index.tsx                                ← Redirect → step-1
  └── step-1.tsx … step-5.tsx
/app/frontend/src/context/OnboardingContext.tsx  ← state + Mifflin/TDEE/macros
/app/frontend/src/components/                    ← primitives (see above)
/app/frontend/src/theme/                         ← tokens
```

## Next Steps
- Home dashboard (real): today's session card, week ring, streak, next meal
- Log workout screen (uses `<Thread>`)
- Log meal screen (uses `<Thread>`)
- History timeline (the natural home for `<Thread>`)
- Coach chat
- Profile persistence beyond a single session (auth or device-local session)
