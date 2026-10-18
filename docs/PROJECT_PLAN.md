# KidRhythm Project Plan

## 1. Product Thesis

Parents do not need another list of random kids activities. They need a tool that helps them understand the whole child so they can tailor better routines at home.

KidRhythm should understand:

- energy patterns
- temperament and transition needs
- interests and avoidances
- attention span and independence
- sensory and mess tolerance
- sibling dynamics
- household context
- what has actually worked before

KidRhythm should combine:

- whole-child profiles
- a structured activity library
- a flexible daily schedule
- a queue that rotates between activity types
- lightweight feedback from parents
- parent-visible insights that remain explainable

The product should work even when the family ignores the plan, starts late, skips activities, or needs a fast reset.

## 2. Target Users

Primary user:

- Parent or caregiver with one or more kids at home.
- Wants fewer decisions and less chaos.
- Needs options that fit the moment, not generic inspiration.

Secondary users:

- Babysitters, grandparents, or other caregivers following a parent-created rhythm.
- Kids old enough to read or use a simplified "next activity" screen.

Non-target for MVP:

- Schools.
- Daycare centers.
- Public social sharing communities.
- Fully autonomous child-directed apps.

## 3. Product Principles

1. Parent control first.
2. Local-first and privacy-first by default.
3. Recommendations must be explainable.
4. The product should support the whole child without making medical, diagnostic, or therapeutic claims.
5. The schedule is flexible, not punitive.
6. The app should be useful without AI.
7. Kids should not be nudged into more screen time.
8. Activities should respect supplies, mess, supervision, and safety.
9. The UI should be fast to operate with one hand while distracted.

## 4. MVP Scope

The MVP should answer three questions well:

1. What does this child seem to need now?
2. What can the kids do next that fits that need?
3. What is planned for the rest of today?
4. What patterns have worked for this household before?

### Included

- Household setup
- Child profiles
- Child signals: energy, interests, transition needs, independence, sensory/mess tolerance
- Activity library
- Activity metadata
- Daily rhythm templates
- Today schedule
- Activity queue
- Family organizer basics: groceries, to-dos, meal plan, and caregiver notes
- Local household account gate
- Parent feedback
- Basic whole-child pattern learning
- Local persistence
- Seed activity pack
- Import/export backup

### Excluded Initially

- Cross-device sync
- Cloud-backed production accounts
- Public sharing
- AI-generated activities as a core dependency
- In-app purchases
- Wearables
- School integrations
- Calendar integrations
- Push notifications
- Third-party behavioral analytics, ad pixels, or paid CMS/theme dependencies

## 5. Core User Flows

### Flow A: First-Time Setup

1. Parent creates a household account before seeing planner data.
2. Parent adds household name or confirms the account household name.
3. Parent adds child profiles with age range and broad preference signals.
4. Parent selects constraints:
   - typical wake time
   - quiet time or nap window
   - meal windows
   - screen-time rules
   - indoor/outdoor availability
   - supervision availability
5. Parent selects whole-child signals:
   - energy patterns
   - transition sensitivity
   - independence level
   - sensory and mess tolerance
   - current interests
6. Parent selects supplies already available at home.
7. App creates a starter daily rhythm and queue.

Success criteria:

- Parent reaches "Today" view in under five minutes.
- No sensitive data is required.
- Parent can skip any setup step.

### Flow B: What Should We Do Now?

1. Parent opens the Today view.
2. App shows the current recommended activity and two alternates.
3. Parent can start, skip, reschedule, swap, or mark as not possible.
4. App adjusts the remaining queue and schedule.

Success criteria:

- The recommendation explains why it fits now.
- Alternatives are meaningfully different, not duplicates.
- Parent can act in one or two taps.

### Flow C: Schedule the Day

1. Parent chooses a daily rhythm template or starts from today.
2. Parent drags or taps blocks into rough time windows.
3. App fills gaps with suitable activity categories.
4. Parent locks important blocks and leaves flexible ones adaptive.

Success criteria:

- The schedule tolerates late starts and skipped activities.
- Locked blocks are respected.
- Activities can be repeated, moved, shortened, or replaced.

### Flow D: Feedback and Learning

1. After an activity, parent can mark:
   - worked well
   - too hard
   - too messy
   - too much supervision
   - child disliked it
   - try again later
2. Parent can also mark child-state signals like low energy, needs connection, needs movement, or needs quiet.
3. App updates activity scores for similar contexts.
4. App shows plain-language reasons over time, such as "quiet activities after lunch usually work better."

Success criteria:

- Feedback is optional and fast.
- The model is interpretable.
- Parent can reset or edit learned preferences.
- Insights are descriptive and practical, never diagnostic.

## 6. Activity Data Model

Activity fields:

- id
- title
- short description
- age range
- duration minimum and maximum
- energy level: calm, moderate, active
- category: creative, movement, reading, pretend play, sensory, chore, learning, outdoor, social, independent
- supervision: independent, nearby, active adult
- setup burden: none, low, medium, high
- cleanup burden: none, low, medium, high
- mess level: none, low, medium, high
- supplies
- indoor/outdoor
- safety notes
- transition notes
- cooldown fit
- sibling fit
- repeat cooldown
- tags

Household fields:

- children
- supply inventory
- daily constraints
- screen policy
- weather preference
- feedback history
- blocked activities
- preferred activity categories
- child signal preferences: energy, independence, transition needs, interests, sensory/mess tolerance

Schedule fields:

- date
- blocks
- block type
- start time
- end time
- locked status
- assigned activity or category
- status: planned, active, completed, skipped, moved

Feedback fields:

- activity id
- child id or household-level
- timestamp
- context: time of day, before or after meal, weather, parent availability
- rating
- observed child state
- reasons
- notes

## 7. Recommendation Logic

The first version should use deterministic scoring, not opaque AI.

Inputs:

- current time
- open schedule window
- child age range
- child energy and temperament signals
- child interests and avoidances
- recently used activities
- available supplies
- supervision availability
- energy balance
- parent feedback
- activity cooldown
- setup and cleanup burden
- indoor/outdoor setting

Output:

- top recommendation
- two alternates
- explanation

Example scoring factors:

- age fit: hard filter
- required supplies missing: hard filter or heavy penalty
- unsafe or blocked: hard filter
- repeat cooldown violation: penalty
- fits available time: reward
- matches desired energy state: reward
- low setup when parent unavailable: reward
- positive household feedback in similar context: reward
- category diversity: reward

The explanation should be derived from scoring factors, for example:

- "Fits the 25 minute window before lunch."
- "Low cleanup and can be done nearby while you are busy."
- "Creative activities have worked well after quiet time."

## 8. Scheduling Logic

Scheduling should be flexible and block-based.

Block types:

- fixed: meal, nap, appointment, school, bedtime
- guided: parent wants a category, app picks activity
- activity: parent chose a specific activity
- open: app can fill
- unavailable: no activity planned

Rules:

- Fixed blocks cannot move unless parent edits them.
- Locked activity blocks stay in place.
- Open blocks can be filled or collapsed.
- If the day slips, future flexible blocks should shift or shrink.
- Activities must fit their minimum duration unless explicitly allowed.
- Cleanup time should be considered for messy activities.
- High-energy and calm activities should be balanced.

## 9. Privacy and Safety

MVP privacy posture:

- Store data locally by default.
- Require a local household account gate before showing planner data.
- Do not require cloud accounts or sync for the MVP.
- Make export and delete obvious.
- Avoid child photos, precise location, and unnecessary birthdates.
- Use age range instead of exact birthday unless required later.
- Do not sell or share household behavior data.
- Do not include ads to children.
- Production HTTPS web builds may use aggregate GA4 page measurement, but the
  app must not send child profiles, schedules, feedback, account records, or
  local storage values to analytics.

Safety posture:

- Activities should include supervision level and safety notes.
- App should never imply that a child can safely do risky tasks alone.
- Parents remain responsible for suitability.
- Avoid medical, therapeutic, or diagnostic claims.

## 10. UX Structure

Primary views:

- Today
- Schedule
- Family Hub
- Activities
- Household
- Insights

### Today View

Purpose: decide what to do now.

Components:

- current block
- recommended activity
- two alternatives
- quick actions
- next few blocks
- parent availability toggle
- energy target selector

### Schedule View

Purpose: shape the day.

Components:

- timeline
- block editor
- rhythm templates
- lock/flexible toggle
- reschedule controls

### Family Hub View

Purpose: keep the practical household context parents already manage nearby.

Components:

- grocery list
- family to-dos
- meal plan
- caregiver handoff notes
- local edit/delete controls

### Activities View

Purpose: manage the library.

Components:

- filters
- activity cards
- supply requirements
- edit activity
- add custom activity

### Household View

Purpose: configure constraints.

Components:

- children
- supplies
- routines
- screen rules
- privacy/export/delete

### Insights View

Purpose: show learned whole-child patterns without making the app feel creepy or clinical.

Components:

- simple pattern cards
- "works well" contexts
- blocked or disliked activities
- reset learning
- child signal summaries
- parent-editable interpretations

## 11. Technical Direction

Recommended MVP stack:

- TypeScript
- React
- Vite
- local-first browser storage
- deterministic domain logic with unit tests
- optional later wrapper as PWA

Why:

- fast iteration
- simple local demo
- easy UI testing
- no backend required for MVP
- portable to mobile later

Initial architecture:

- `src/domain`: scheduling, scoring, activity rules
- `src/data`: seed data, persistence adapters
- `src/ui`: components and views
- `src/app`: routing and state orchestration
- `tests`: domain fixtures and behavior tests

Avoid:

- copying competitor branding, proprietary UI, or content
- old WordPress/plugin stacks for the app shell
- paid themes such as Divi for MVP functionality
- behavioral analytics and ad pixels such as Clicky, Google Analytics UA,
  comScore, ScorecardResearch, Optimizely, or Facebook Pixel; if public
  measurement is needed, use the approved GA4 page-view loader without custom
  household events
- backend before sync is needed
- LLM calls in the critical path
- complex cloud auth before backend or sync is needed
- overbuilt calendar integration
- generalized plugin systems

## 12. Build Phases

### Phase 0: Product Grounding

Deliverables:

- product plan
- Codex continuity plan
- seed data schema
- quality bar

Exit criteria:

- project docs exist
- MVP scope is explicit
- next build task is clear

### Phase 1: Prototype Shell

Deliverables:

- app scaffold
- Today view
- static seed activities
- simple queue
- basic schedule blocks

Exit criteria:

- user can view a recommended activity
- user can see the rest of today
- app runs locally

### Phase 2: Domain Logic

Deliverables:

- activity scoring engine
- schedule block model
- filtering rules
- feedback model
- unit tests

Exit criteria:

- recommendations are generated from constraints
- scoring explanations are visible
- core logic has tests

### Phase 3: Parent Controls

Deliverables:

- setup flow
- child profiles
- household constraints
- supply inventory
- activity feedback
- custom activity editor

Exit criteria:

- app adapts to household setup
- parent can change recommendation inputs
- feedback changes future recommendations

### Phase 4: Scheduling

Deliverables:

- daily rhythm templates
- block editor
- flexible rescheduling
- activity assignment
- skipped/moved/completed states

Exit criteria:

- parent can plan a day
- app can recover from schedule drift
- locked blocks are respected

### Phase 5: Persistence and Polish

Deliverables:

- local persistence
- import/export
- empty states
- responsive design
- accessibility pass
- basic visual polish

Exit criteria:

- app survives refresh
- data can be exported and deleted
- mobile viewport is usable

### Phase 6: Validation

Deliverables:

- scenario fixtures
- usability checklist
- privacy checklist
- smoke tests
- small family test plan

Exit criteria:

- app handles realistic days
- bad recommendations are traceable
- major product risks are documented

## 13. Quality Bar

The tool is not good enough if:

- recommendations feel random
- activities are vague
- child profiles are only names and ages
- parent controls are buried
- schedule changes are brittle
- privacy is unclear
- AI output appears without review
- insights feel clinical, judgmental, or creepy
- the UI looks like a generic SaaS template
- the app requires a long setup before value

The tool is good when:

- a parent can open it and act quickly
- activity suggestions fit the current household context
- recommendations reflect the child's energy, interests, independence, and transition needs
- schedule changes feel forgiving
- feedback visibly improves the queue
- the product works offline or local-first
- the app avoids manipulative child engagement patterns

## 14. Risks

Product risks:

- Too much setup before first value.
- Recommendations become bland or repetitive.
- Parents do not want to log feedback.
- Scheduling feels like guilt instead of help.

Technical risks:

- Pattern learning becomes opaque.
- Domain rules become tangled with UI.
- Persistence decisions block later sync.

Trust risks:

- Child data handling is unclear.
- Whole-child insights drift into diagnosis or parenting judgment.
- AI-generated activities feel unsafe or low quality.
- App seems to judge parenting.

Mitigations:

- Start with a fast Today view.
- Keep feedback optional.
- Use interpretable scoring first.
- Store minimal data.
- Keep wording calm and nonjudgmental.

## 15. Immediate Next Steps

1. Choose exact MVP platform: web PWA is recommended.
2. Scaffold the app.
3. Create seed activity data.
4. Implement domain types and scoring function.
5. Build the Today view around real scoring output.
6. Add tests for ranking and schedule fit.
7. Add local persistence.
