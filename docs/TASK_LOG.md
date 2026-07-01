# Task Log

## Current Status

Status: product positioning pivoting to KidRhythm and whole-child routines.

Project path:

```text
/Users/alinafe/src/kid-rhythm
```

## Active Task

Next task: reshape the product model and UI around whole-child signals, then decide whether to rename the GitHub repo/local folder.

## Completed

- Defined the product as a parent-controlled child rhythm and activity tool.
- Created project documentation.
- Added durable Codex instructions in `AGENTS.md`.
- Added a detailed product and build plan in `docs/PROJECT_PLAN.md`.
- Added continuity rules in `docs/CODEX_CONTINUITY.md`.
- Moved project to `~/src/kid-rhythm`.
- Scaffolded a TypeScript React/Vite app.
- Added seed activity data for a mixed sibling household.
- Added domain types, deterministic recommendation scoring, and schedule helpers.
- Added a Today view with context controls, current recommendation, alternates, feedback actions, and basic schedule assignment.
- Added Vitest tests for recommendation and schedule behavior.
- Removed unused SVG starter assets and replaced the default favicon.
- Initialized local git repository and pushed to a private GitHub repo.
- Added typed local persistence for household, schedule, feedback, and recent activity state.
- Added editable children and supply controls.
- Added an activity detail panel with schedule/block controls.
- Added PWA manifest and production service worker registration.
- Added Tauri desktop wrapper and app-only macOS build script.
- Built unsigned local macOS app bundle at `src-tauri/target/release/bundle/macos/KidRhythm.app`.
- Added `docs/MACOS_APP.md` for build, DMG, signing, and notarization notes.
- Recorded product pivot: understanding the whole child is how the app tailors better routines.
- Adopted `KidRhythm` as the working product name.
- Set `getkidrhythm.com` as the domain target based on current RDAP availability check.
- Rebuilt the unsigned macOS app as `KidRhythm.app`.
- Renamed the private GitHub repo from `family-rhythm` to `kid-rhythm`.

## Key Decisions

- MVP should be local-first.
- MVP should not require AI.
- Recommendation logic should begin as deterministic scoring with explainable reasons.
- Web PWA is the recommended first platform.
- Parent control, privacy, and testability are higher priority than novelty.
- First platform is React/Vite.
- First activity pack targets a mixed sibling household, ages 5 and 7.
- Schedule blocks use exact times in the first slice.
- Plain `localStorage` is the first persistence adapter.
- Tauri is the macOS packaging path.
- Default desktop build is app-only until DMG/signing is ready.
- Whole-child understanding is the product North Star.
- Better routines are the product outcome.
- Whole-child signals must stay parent-controlled, practical, and non-diagnostic.

## Open Questions

- Should the app include any AI-generated activity drafting later, or keep AI only as a planning assistant outside the product?
- Do you have an Apple Developer Program account and Developer ID Application certificate for signing?
- Which whole-child signals should be first-class in the MVP: energy, interests, temperament, transition needs, sensory/mess tolerance, independence, sibling dynamics?

## Next Recommended Task

Choose next track:

- Product track: add whole-child signal fields, insight cards, schedule editing, custom activities, and import/export.
- Distribution track: configure Developer ID signing, notarization credentials, and DMG build.

## Checks Run

Application checks:

- `npm test`: passed, 12 tests
- `npm run build`: passed
- `npm run lint`: passed
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed
- `npm run desktop:build`: passed, produced unsigned `KidRhythm.app`
- `npm run desktop:build:dmg`: native app compiled but DMG finalization failed in `bundle_dmg.sh`

Dev server:

- last run at `http://127.0.0.1:5173/`; not currently running

Repository state:

- local git repository initialized on `main`
- private GitHub repo: `https://github.com/alinafe82/kid-rhythm`
- remote: `origin` -> `https://github.com/alinafe82/kid-rhythm.git`
- initial commit: `6ad7ee2` (`Initial family rhythm MVP slice`)
- remote verified private with default branch `main`
