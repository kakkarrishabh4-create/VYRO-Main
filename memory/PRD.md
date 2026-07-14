# VYRO — Product Requirements Document

## Overview
VYRO is a mobile app for a transformation coach's clients to track workouts and nutrition. It is deliberately anti-generic-gym-app: personal, disciplined, human — the mobile equivalent of a well-kept training journal.

## Current Milestone: Design System Foundation
This iteration establishes the visual foundation only. **No screens have been built.** All future screens must consume the tokens and primitives defined below so the app stays consistent by construction, not by convention.

## Design Tokens (source of truth)
`/app/design_guidelines.json` — machine-readable specification. Human-readable summary:

### Colors
| Token | Hex | Role |
|---|---|---|
| Ink | `#17191B` | Primary dark background |
| Bone | `#F6F4EF` | Light surface / primary text on dark |
| Moss | `#3E5C46` | Primary buttons, active states |
| Brass | `#B98B3E` | **Sparingly** — streaks, PRs, milestones only |
| Slate | `#6B7280` | Secondary text |

Supporting: `inkSoft`, `boneSoft`, hairline colors, muted moss pressed state.

### Typography (three families, one job each)
- **Fraunces** — headings only (display / h1 / h2 / h3)
- **Inter** — body, buttons, all UI labels
- **IBM Plex Mono** — all numeric data (weights, reps, calories, macros) so columns align

### Spacing (8pt grid)
`xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48`

### Radius
`sm 4 · md 8 · lg 12` — buttons/cards default to **8px, never pill**.

### Signature: the "Thread"
A thin 1px vertical line (Moss at 50% alpha on Ink) inset 24px from the left, with a 6px dot at each entry. Connects consecutive journal entries on any history/timeline view.

### Forbidden (hard rules)
- Gradients
- Drop shadows (elevation = 1px hairline only)
- Pill-shaped buttons
- Card-grid dashboards
- Stock/flat clipart icons or emoji as icons
- Mixed icon families (locked to Feather)

## File Structure
```
/app/design_guidelines.json         ← tokens (JSON source of truth)
/app/frontend/assets/fonts/         ← Fraunces, Inter, IBM Plex Mono TTFs
/app/frontend/src/theme/
  ├── index.ts                       ← barrel export
  ├── colors.ts                      ← color tokens
  ├── typography.ts                  ← type scale + font family names
  ├── spacing.ts                     ← spacing / radius / thread constants
  └── fonts.ts                       ← expo-font source map
/app/frontend/src/components/
  ├── index.ts                       ← barrel export
  ├── Button.tsx                     ← primary (Moss) / secondary (outline)
  ├── Card.tsx                       ← hairline surface, no shadow
  ├── Thread.tsx                     ← Thread + ThreadEntry (signature element)
  ├── LineIcon.tsx                   ← Feather-only wrapper
  └── Typography.tsx                 ← Heading / BodyText / Numeric
/app/frontend/app/_layout.tsx        ← loads fonts, sets Ink bg globally
/app/frontend/app/index.tsx          ← theme-verification placeholder (delete before shipping)
```

## Import Contract for Future Screens
```ts
import { colors, spacing, radius, typography } from '@/src/theme';
import { Button, Card, Heading, BodyText, Numeric, Thread, ThreadEntry, LineIcon } from '@/src/components';
```
Screens must **never** hardcode hex values, font family strings, or spacing numbers. They must **never** use raw `<Text>` — always go through `Heading` / `BodyText` / `Numeric`.

## Backend
Untouched this iteration — default `/api/status` scaffold only.

## Next Steps (not built)
Screens will be layered on this foundation in subsequent iterations: onboarding, today's session, log workout, log meal, history timeline (which will use `<Thread>`), progress, coach chat.
