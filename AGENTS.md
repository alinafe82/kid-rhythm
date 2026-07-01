# AGENTS.md

## Project Purpose

Build KidRhythm, a parent-controlled whole-child routine tool that rotates and schedules at-home kids activities based on each child's signals, household patterns, constraints, and feedback.

The product goal is a useful family operations tool, not an AI demo. Prioritize deterministic behavior, clear UX, privacy, parent control, and testable scheduling logic.

## Product Standards

- Build for tired parents who need fast decisions and low-friction control.
- Keep kid data private and minimal. Do not add tracking, ads, public sharing, or third-party behavioral analytics.
- Treat whole-child understanding as practical fit signals, not diagnosis or clinical assessment.
- Treat AI as optional. The core planner, scheduler, and feedback loop must work without AI.
- Prefer explainable recommendations over opaque personalization.
- Avoid generic "activity idea" slop. Every activity should include age fit, duration, supervision level, energy level, setup burden, cleanup burden, supplies, and safety notes.
- Design around real home constraints: meals, naps, school work, chores, weather, parent meetings, sibling conflicts, screen limits, and cleanup.

## Engineering Standards

- Start with a narrow vertical slice before expanding the surface area.
- Keep domain logic separate from UI code.
- Make scheduling and recommendation decisions testable with fixtures.
- Prefer local-first persistence for MVP unless the user explicitly asks for accounts or sync.
- Add tests when changing ranking, scheduling, recurrence, profile, or privacy behavior.
- Do not add production dependencies without a short reason.
- Do not store secrets in the repo.

## Codex Workflow

- Before implementation, read `docs/TASK_LOG.md` and the relevant section of `docs/PROJECT_PLAN.md`.
- Keep `docs/TASK_LOG.md` updated when a decision is made, a phase changes, or a session ends.
- If context gets large, compact by preserving current goal, current files, decisions made, failing checks, and next commands.
- If asked to shift focus, update `docs/TASK_LOG.md` with the paused state before starting the new work.
- Prefer small, reviewable changes.
- Run the most relevant checks before finishing, and report any checks that could not be run.

## Definition of Done

A task is done when:

- the requested behavior is implemented or the requested plan artifact exists
- relevant tests or checks have run, or the gap is explicitly noted
- docs are updated if the product direction, architecture, or workflow changed
- `docs/TASK_LOG.md` has a concise handoff note for the next session
