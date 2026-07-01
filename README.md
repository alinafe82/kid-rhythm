# KidRhythm

KidRhythm is a parent-controlled whole-child routine tool for kids at home. It helps a household understand what supports each child across energy, temperament, interests, context, and day rhythm, then turns that understanding into better routines and practical activity choices.

The product should feel practical, calm, and trustworthy. It is not a chatbot wrapper, a random prompt generator, or a screen-time reward machine.

## Working Docs

- [Project plan](docs/PROJECT_PLAN.md): product strategy, phases, architecture, data model, and release plan.
- [Codex continuity](docs/CODEX_CONTINUITY.md): how to run Codex sessions without losing project context.
- [macOS app packaging](docs/MACOS_APP.md): Tauri build output and signing/notarization path.
- [Task log](docs/TASK_LOG.md): current status, next actions, open questions, and decision history.

## Repository

Private GitHub repo:

```text
https://github.com/alinafe82/kid-rhythm
```

Domain target:

```text
getkidrhythm.com
```

## Development

```bash
npm install
npm run dev
npm test
npm run build
npm run lint
npm run desktop:build
```

## Current Direction

The first build should be a local-first web app or mobile-ready PWA with:

- child profiles
- whole-child preference signals
- household constraints
- activity library
- activity queue
- flexible daily schedule
- parent feedback loop
- parent-visible child insights
- privacy-first local data model

AI should be optional and subordinate to product logic. The MVP can work without any model calls.

## Current Slice

The app currently includes a Today view backed by deterministic scoring, seed activity data, basic schedule blocks, whole-child signal controls, parent-visible fit insights, editable child/supply data, feedback actions, local persistence, and unit tests for recommendation, schedule, and persistence logic.
