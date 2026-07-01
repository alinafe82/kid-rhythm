# Family Rhythm

Family Rhythm is a parent-controlled activity planner for kids at home. It helps a household answer "what should the kids do now?" and "when should we do it?" using a rotating activity queue, a flexible schedule, household constraints, and feedback from what actually works.

The product should feel practical, calm, and trustworthy. It is not a chatbot wrapper, a random prompt generator, or a screen-time reward machine.

## Working Docs

- [Project plan](docs/PROJECT_PLAN.md): product strategy, phases, architecture, data model, and release plan.
- [Codex continuity](docs/CODEX_CONTINUITY.md): how to run Codex sessions without losing project context.
- [Task log](docs/TASK_LOG.md): current status, next actions, open questions, and decision history.

## Repository

Private GitHub repo:

```text
https://github.com/alinafe82/family-rhythm
```

## Development

```bash
npm install
npm run dev
npm test
npm run build
npm run lint
```

## Current Direction

The first build should be a local-first web app or mobile-ready PWA with:

- child profiles
- household constraints
- activity library
- activity queue
- flexible daily schedule
- parent feedback loop
- privacy-first local data model

AI should be optional and subordinate to product logic. The MVP can work without any model calls.

## Current Slice

The app currently includes a Today view backed by deterministic scoring, seed activity data, basic schedule blocks, parent controls, feedback actions, and unit tests for recommendation and schedule logic.
