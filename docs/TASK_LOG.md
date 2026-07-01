# Task Log

## Current Status

Status: first MVP vertical slice implemented.

Project path:

```text
/Users/alinafe/src/family-rhythm
```

## Active Task

Next task: add local persistence and custom household setup so the Today view uses editable data instead of demo fixtures.

## Completed

- Defined the product as a family rhythm and activity scheduling tool.
- Created project documentation.
- Added durable Codex instructions in `AGENTS.md`.
- Added a detailed product and build plan in `docs/PROJECT_PLAN.md`.
- Added continuity rules in `docs/CODEX_CONTINUITY.md`.
- Moved project to `~/src/family-rhythm`.
- Scaffolded a TypeScript React/Vite app.
- Added seed activity data for a mixed sibling household.
- Added domain types, deterministic recommendation scoring, and schedule helpers.
- Added a Today view with context controls, current recommendation, alternates, feedback actions, and basic schedule assignment.
- Added Vitest tests for recommendation and schedule behavior.
- Removed unused SVG starter assets and replaced the default favicon.

## Key Decisions

- MVP should be local-first.
- MVP should not require AI.
- Recommendation logic should begin as deterministic scoring with explainable reasons.
- Web PWA is the recommended first platform.
- Parent control, privacy, and testability are higher priority than novelty.
- First platform is React/Vite.
- First activity pack targets a mixed sibling household, ages 5 and 7.
- Schedule blocks use exact times in the first slice.

## Open Questions

- Should the app include any AI-generated activity drafting later, or keep AI only as a planning assistant outside the product?
- Should local persistence use plain `localStorage` first or an IndexedDB adapter from the start?
- Should the setup flow be a modal wizard or an inline Household view?

## Next Recommended Task

Add local persistence and editable household setup:

- persist feedback, recent activities, and schedule assignments
- add a Household view for children and supplies
- add an activity detail/edit surface
- keep all recommendation logic deterministic and tested

## Checks Run

Application checks:

- `npm test`: passed, 8 tests
- `npm run build`: passed
- `npm run lint`: passed

Dev server:

- running at `http://127.0.0.1:5173/`

Repository state:

- local git repository initialized on `main`
- initial commit: `e5e5a2e` (`Initial family rhythm MVP slice`)
- GitHub remote is pending because `gh auth status` reports an invalid token for `alinafe82`
