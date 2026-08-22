# Task Log

## Current Status

Status: KidRhythm has a working local-first whole-child recommendation, household organizer, and local household account gate.

Project path:

```text
/Users/alinafe/src/kid-rhythm
```

## Active Task

Completed this session: added account gating so the planner is not exposed before a parent creates or signs into a household account.

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
- Added first-class whole-child signal data to child profiles: energy, transition need, independence, mess tolerance, sensory need, and interests.
- Added localStorage migration defaults for older child records without signal data.
- Added signal-aware deterministic recommendation scoring with parent-visible reasons and cautions.
- Added a whole-child fit panel and editable signal controls in the Today UI.
- Added a Cozi-inspired Family Hub with local groceries, family to-dos, meal plan entries, and caregiver handoff notes.
- Extended local persistence and migration defaults for Family Hub data.
- Added persistence tests for organizer defaults, stored edits, old records, and malformed organizer rows.
- Updated the project plan to record the free/local-first Cozi benchmark decision and explicitly avoid paid themes, old WordPress/plugin stacks, and third-party tracking scripts.
- Added Vitest V8 coverage tooling with enforced 100% statements, branches, functions, and lines for `src/domain` and `src/data`.
- Expanded domain/data tests from 17 to 38 cases to cover recommendation filters, scoring branches, schedule edge cases, and localStorage migration/fallback paths.
- Reworked the website shell to better match the chosen Cozi-style family organizer direction: site header/navigation, centered hero summary, Open Sans-style font stack, brighter family-friendly palette, softer cards, and responsive page-width layout.
- Added local account/session persistence helpers for a household account gate.
- Gated the planner UI so the account screen renders first and the planner does not mount until a local account session exists.
- Added sign out behavior that clears the local session without deleting household planner data.
- Added account persistence tests for create, sign-in verification, clearing, missing storage, malformed records, and session mismatch cases.

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
- Cozi is a useful benchmark for family operations, but KidRhythm should not copy Cozi branding, proprietary content, or tracking stack.
- MVP family organizer features should use the existing free React/Vite/localStorage stack instead of WordPress 5.1.1, Divi, paid plugins, or analytics pixels.
- The enforced 100% coverage gate applies to deterministic core logic in `src/domain` and `src/data`; UI coverage should wait for a browser/React test harness.
- Visual direction should benchmark Cozi's family organizer clarity while using original KidRhythm branding, local-first privacy, and no third-party tracking or paid theme dependencies.
- The MVP account gate is local-only and free: it hides household data on the current device, but it is not production cloud authentication or cross-device identity.
- The planner should not mount until a local household account session exists.

## Open Questions

- Should the app include any AI-generated activity drafting later, or keep AI only as a planning assistant outside the product?
- Do you have an Apple Developer Program account and Developer ID Application certificate for signing?
- Should sibling dynamics become its own first-class signal, or stay implicit in activity metadata for the next slice?
- Should the Family Hub get import/export next, or should schedule editing remain the priority?
- What production authentication and backend should replace the local-only account gate before public launch?

## Next Recommended Task

Choose next track:

- Product track: add schedule editing, custom activities, sibling-dynamics signals, and import/export.
- Family Hub track: add inline editing, recurring chores, list sections, print/export, and connection between meal plans and grocery items.
- Auth track: add production accounts, backend persistence, password reset, and cross-device sync before letting real families rely on accounts across devices.
- Distribution track: configure Developer ID signing, notarization credentials, and DMG build.

## Checks Run

Application checks:

- `npm test`: passed, 16 tests
- `npm run build`: passed
- `npm run lint`: passed
- `npm test`: passed, 17 tests after Family Hub persistence changes
- `npm run lint`: passed after Family Hub changes
- `npm run build`: passed after Family Hub changes
- `npm run test:coverage`: passed with 100% statements, branches, functions, and lines across `src/domain` and `src/data`
- `npm test`: passed, 38 tests
- `npm run lint`: passed after coverage/test changes
- `npm run build`: passed after coverage/test changes
- `npm run lint`: passed after website design correction
- `npm run build`: passed after website design correction
- `npm test`: passed, 38 tests after website design correction
- `npm run test:coverage`: passed at 100% statements, branches, functions, and lines for `src/domain` and `src/data` after website design correction
- `npm run lint`: passed after account gate
- `npm run build`: passed after account gate
- `npm test`: passed, 44 tests after account gate
- `npm run test:coverage`: passed at 100% statements, branches, functions, and lines for `src/domain` and `src/data` after account gate
- `curl -fsSL http://127.0.0.1:5173/`: passed after account gate
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed
- `npm run desktop:build`: passed, produced unsigned `KidRhythm.app`
- `npm run desktop:build:dmg`: native app compiled but DMG finalization failed in `bundle_dmg.sh`

Dev server:

- currently running at `http://127.0.0.1:5173/` from `npm run dev -- --host 127.0.0.1`

Repository state:

- local git repository initialized on `main`
- private GitHub repo: `https://github.com/alinafe82/kid-rhythm`
- remote: `origin` -> `https://github.com/alinafe82/kid-rhythm.git`
- initial commit: `6ad7ee2` (`Initial family rhythm MVP slice`)
- remote verified private with default branch `main`

## 2026-08-04 Maintenance Handoff

- Applied npm's non-breaking security updates and aligned React/ReactDOM on the current 19.2.8 patch; no product behavior changed.
- `npm audit`: passed with 0 vulnerabilities.
- `npm run lint`: passed.
- `npm test`: passed, 44 tests.
- `npm run build`: passed.
- Next product task remains one of the tracks listed above; no feature work was started in this maintenance pass.

## 2026-08-04 Planner Architecture Handoff

- Moved household, schedule, feedback, and Family Hub state transitions behind the pure `applyPlannerAction` interface in `src/domain/planner.ts`.
- React now owns rendering and transient form state; persisted planner invariants live in the domain module and are tested through its public interface.
- Added planner transition coverage while retaining the enforced 100% domain/data coverage gate.
- Verification: `npm run lint`, `npm run build`, and `npm run test:coverage` pass (51 tests, 100% statements/branches/functions/lines).

## 2026-08-22 Schedule Boundary Handoff

- Schedule time parsing now rejects malformed values and times outside `00:00` through
  `23:59` instead of allowing `NaN` or out-of-day minutes into planner state.
- Display-time formatting now rejects negative, fractional, non-numeric, and next-day minute
  values instead of producing misleading labels.
- The public `toMinutes` and `formatTime` helpers retain compact whole-hour input such as `7`.
- Verification: `npm test`, `npm run test:coverage`, `npm run lint`, and `npm run build`.
