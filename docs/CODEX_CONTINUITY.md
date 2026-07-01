# Codex Continuity Plan

## Purpose

This file keeps Codex useful across compaction, closed sessions, resumed work, and focus shifts. It should be short enough to read at the start of any session and concrete enough to prevent rediscovery.

## Session Start Checklist

At the start of a Codex session in this project:

1. Read `AGENTS.md`.
2. Read `docs/TASK_LOG.md`.
3. Read the relevant phase in `docs/PROJECT_PLAN.md`.
4. Check the current file tree.
5. Confirm the next task before editing.

## Best Prompt Shape

Use this pattern for implementation prompts:

```text
Goal: Build or change <specific behavior>.
Context: Read AGENTS.md, docs/TASK_LOG.md, and docs/PROJECT_PLAN.md section <x>.
Constraints: Keep core logic deterministic, local-first, and tested. Do not add AI calls.
Done when: <specific behavior works>, relevant tests pass, and TASK_LOG.md is updated.
```

Use this pattern for planning prompts:

```text
Interview me first, challenge weak assumptions, then update the plan docs.
Do not implement until the plan is explicit.
```

## Context Preservation Rules

Keep these items durable in files, not only in chat:

- current product direction
- current phase
- active task
- open decisions
- architecture decisions
- known broken checks
- next commands to run
- files currently being edited

Do not rely on chat memory for:

- product requirements
- privacy decisions
- data model changes
- scoring logic
- release criteria

## Focus Shift Protocol

When switching tasks:

1. Stop and summarize the current task in `docs/TASK_LOG.md`.
2. Record whether work is complete, paused, or blocked.
3. List touched files.
4. List checks already run.
5. Add the new task under "Active Task".

This keeps a later session from guessing what happened.

## Compaction Protocol

If context gets compacted, the essential summary should include:

- project path
- current phase
- current active task
- key decisions
- files changed
- commands run
- failing or skipped checks
- exact next step

Suggested compact summary:

```text
Project: /Users/alinafe/Projects/personal/family-rhythm
Read first: AGENTS.md, docs/TASK_LOG.md, docs/PROJECT_PLAN.md
Current phase: <phase>
Active task: <task>
Changed files: <files>
Checks: <commands and results>
Next step: <single next action>
```

## Goal Mode Guidance

Use a persistent goal for multi-step implementation work. Good goal text:

```text
Build the Family Rhythm MVP vertical slice: a local-first web app where a parent can view a Today screen, get a deterministic activity recommendation from seed data, schedule it into a flexible block, provide feedback, and see the recommendation adapt. Done when the app runs locally, core domain logic has tests, and docs/TASK_LOG.md is updated.
```

Do not use a broad goal like "build the app." The goal should include completion criteria.

## Plan Mode Guidance

Use plan-first work when:

- product scope is changing
- privacy or child-safety implications are unclear
- adding a backend, account system, or sync
- adding AI-generated activities
- changing the recommendation model
- restructuring architecture

## What Belongs Where

- `AGENTS.md`: durable Codex behavior and engineering standards.
- `docs/PROJECT_PLAN.md`: product and technical plan.
- `docs/TASK_LOG.md`: current state and handoff.
- Source code comments: only explain non-obvious logic.
- Tests: expected behavior of scoring, scheduling, and persistence.

## Anti-Slop Guardrails

Before accepting a Codex-generated feature, check:

- Does the feature solve a real parent workflow?
- Can the app work without AI?
- Is the recommendation explainable?
- Is the data model explicit?
- Are privacy implications clear?
- Can the behavior be tested?
- Does the UI avoid generic marketing copy?
- Is there a realistic empty state?

If the answer is no, fix the underlying product or engineering issue before polishing.

