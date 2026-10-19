import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { loadAccount } from './data/account'
import {
  createDefaultChildSignals,
  createDefaultAppState,
  createEmptyAppState,
  loadPlannerState,
  parsePlannerBackup,
  MAX_BACKUP_BYTES,
  saveAppState,
  type AppState,
  type StorageLike,
} from './data/appState'
import { seedActivities } from './data/seedActivities'
import {
  editSchedule,
  findCurrentBlock,
  findNextFlexibleBlock,
  formatTime,
  getAvailableMinutes,
  toMinutes,
} from './domain/schedule'
import { rankActivities } from './domain/recommendation'
import {
  applyPlannerAction,
  type OrganizerItemListName,
  type PlannerAction,
} from './domain/planner'
import type {
  Activity,
  ActivityCategory,
  ActivitySetting,
  BurdenLevel,
  ChildProfile,
  ChildSignals,
  EnergyLevel,
  FamilyOrganizer,
  FeedbackRating,
  HouseholdProfile,
  IndependenceNeed,
  MealPlanEntry,
  OrganizerItem,
  ScheduleBlock,
  SensoryNeed,
  SupervisionLevel,
  TransitionNeed,
} from './domain/types'

const energyOptions: EnergyLevel[] = ['calm', 'moderate', 'active']
const categoryOptions: ActivityCategory[] = [
  'creative',
  'movement',
  'reading',
  'pretend',
  'sensory',
  'chore',
  'learning',
  'outdoor',
  'social',
  'independent',
]
const transitionOptions: TransitionNeed[] = ['easy', 'warmup', 'sensitive']
const independenceOptions: IndependenceNeed[] = [
  'independent',
  'nearby',
  'together',
]
const messToleranceOptions: BurdenLevel[] = ['none', 'low', 'medium', 'high']
const sensoryOptions: SensoryNeed[] = [
  'low-stimulus',
  'balanced',
  'sensory-seeking',
]
const supervisionOptions: SupervisionLevel[] = ['independent', 'nearby', 'active']
const settingOptions: ActivitySetting[] = ['indoor', 'outdoor', 'either']

const allSupplies = Array.from(
  new Set(seedActivities.flatMap((activity) => activity.supplies)),
).sort()

type PlannerNotice = {
  id: number
  message: string
  onUndo?: () => void
}

function App() {
  // Legacy names may be reused locally; the old account/session records are not erased.
  const householdName = loadAccount(getBrowserStorage())?.householdName ?? 'your household'
  return <PlannerApp householdName={householdName} />
}

interface PlannerAppProps {
  householdName: string
}

function PlannerApp({ householdName }: PlannerAppProps) {
  const [initial] = useState(() => loadPlannerState(getBrowserStorage()))
  const [appState, updateState] = useState<AppState>(initial.state)
  const appStateRef = useRef(initial.state)
  const [storageWarning, setStorageWarning] = useState(initial.warning)
  const [backupMessage, setBackupMessage] = useState('')
  // Only parent actions write storage. Mounting never rewrites existing bytes.
  const setAppState = (update: AppState | ((current: AppState) => AppState)) => {
    const next = typeof update === 'function' ? update(appStateRef.current) : update
    appStateRef.current = next
    updateState(next)
    if (initial.canPersist) setStorageWarning(saveAppState(getBrowserStorage(), next) ? '' : 'Changes could not be saved on this device. Keep this page open; changes may be lost when you close it.')
  }
  const [useCurrentTime, setUseCurrentTime] = useState(true)
  const [nowMinutes, setNowMinutes] = useState(currentMinutes)
  const [desiredEnergy, setDesiredEnergy] = useState<EnergyLevel>('calm')
  const [supervision, setSupervision] = useState<SupervisionLevel>('nearby')
  const [setting, setSetting] = useState<ActivitySetting>('indoor')
  const [selectedActivityId, setSelectedActivityId] = useState(seedActivities[0].id)
  const [groceryText, setGroceryText] = useState('')
  const [todoText, setTodoText] = useState('')
  const [mealDayText, setMealDayText] = useState('')
  const [mealText, setMealText] = useState('')
  const [mealNotesText, setMealNotesText] = useState('')
  const [noteTitleText, setNoteTitleText] = useState('')
  const [noteBodyText, setNoteBodyText] = useState('')
  const [notice, setNotice] = useState<PlannerNotice | null>(null)

  useEffect(() => {
    if (!useCurrentTime) return
    const timer = window.setInterval(() => setNowMinutes(currentMinutes()), 15000)
    return () => window.clearInterval(timer)
  }, [useCurrentTime])

  const activityById = useMemo(
    () => new Map(seedActivities.map((activity) => [activity.id, activity])),
    [],
  )

  const currentBlock = findCurrentBlock(appState.schedule, nowMinutes)
  const activeBlock = currentBlock && !currentBlock.locked && currentBlock.type !== 'fixed' && currentBlock.type !== 'unavailable'
    ? currentBlock
    : findNextFlexibleBlock(appState.schedule, nowMinutes)
  const availableMinutes = getAvailableMinutes(activeBlock, nowMinutes)
  const household = appState.household
  const organizer = appState.organizer

  const recommendations = useMemo(
    () =>
      household.children.length ? rankActivities(seedActivities, household, {
        nowMinutes,
        availableMinutes,
        desiredEnergy,
        supervisionAvailability: supervision,
        setting,
        currentBlock: activeBlock,
      }) : [],
    [
      activeBlock,
      availableMinutes,
      desiredEnergy,
      household,
      nowMinutes,
      setting,
      supervision,
    ],
  )

  const primary = recommendations[0]
  const alternates = recommendations.slice(1, 3)
  const insightCards = useMemo(() => buildInsightCards(household), [household])
  const selectedActivity =
    activityById.get(selectedActivityId) ?? primary?.activity ?? seedActivities[0]
  const selectedActivityBlocked = household.blockedActivityIds.includes(
    selectedActivity.id,
  )

  const dispatchPlanner = (action: PlannerAction) => {
    setAppState((current) => applyPlannerAction(current, action))
  }

  const showNotice = (message: string, onUndo?: () => void) => {
    setNotice((current) => ({ id: (current?.id ?? 0) + 1, message, onUndo }))
  }

  const undoNotice = () => {
    notice?.onUndo?.()
    setNotice((current) => ({ id: (current?.id ?? 0) + 1, message: 'Change undone.' }))
  }

  const recordFeedback = (activity: Activity, rating: FeedbackRating) => {
    dispatchPlanner({
      type: 'record-feedback',
      activity,
      rating,
      nowMinutes,
      timestamp: new Date().toISOString(),
    })

    const feedbackMessages: Record<FeedbackRating, string> = {
      worked: `Recorded: ${activity.title} worked well. Future suggestions will use that.`,
      'too-hard': `Recorded: ${activity.title} felt too hard.`,
      'too-messy': `Recorded: ${activity.title} was too messy.`,
      'too-much-supervision': `Recorded: ${activity.title} needed too much help.`,
      disliked: `Recorded: ${activity.title} was not a good fit.`,
      'try-later': `${activity.title} marked for later. Future suggestions will favor other options.`,
    }

    showNotice(feedbackMessages[rating])
  }

  const scheduleActivity = (activity: Activity) => {
    if (!activeBlock) {
      showNotice('There is no open schedule block for this activity.')
      return
    }

    setSelectedActivityId(activity.id)
    dispatchPlanner({
      type: 'schedule-activity',
      blockId: activeBlock.id,
      activityId: activity.id,
    })
    showNotice(`${activity.title} added to ${activeBlock.label}.`)
  }

  const startActivity = (activity: Activity) => {
    if (!activeBlock || nowMinutes < activeBlock.startMinutes || nowMinutes >= activeBlock.endMinutes) {
      showNotice('There is no active flexible schedule block to start this activity. You can schedule it for a later open block.')
      return
    }

    setSelectedActivityId(activity.id)
    dispatchPlanner({
      type: 'start-activity',
      blockId: activeBlock.id,
      activityId: activity.id,
    })
    showNotice(`${activity.title} started in ${activeBlock.label}.`)
  }

  const updateChild = (childId: string, patch: Partial<ChildProfile>) => {
    dispatchPlanner({ type: 'update-child', childId, patch })
  }

  const addChild = () => {
    dispatchPlanner({
      type: 'add-child',
      child: {
        id: createLocalId('child'),
        name: 'New child',
        age: 6,
        signals: createDefaultChildSignals(),
      },
    })
    showNotice('New child profile added.')
  }

  const updateChildSignals = (
    childId: string,
    patch: Partial<ChildSignals>,
  ) => {
    dispatchPlanner({ type: 'update-child-signals', childId, patch })
  }

  const toggleChildInterest = (childId: string, category: ActivityCategory) => {
    dispatchPlanner({ type: 'toggle-child-interest', childId, category })
  }

  const removeChild = (childId: string) => {
    const child = household.children.find((item) => item.id === childId)

    if (!child) {
      return
    }

    dispatchPlanner({ type: 'remove-child', childId })
    showNotice(`${child.name} removed.`, () =>
      dispatchPlanner({ type: 'add-child', child }),
    )
  }

  const toggleSupply = (supply: string) => {
    dispatchPlanner({ type: 'toggle-supply', supply })
  }

  const addOrganizerItem = (listName: OrganizerItemListName, text: string) => {
    const trimmed = text.trim()

    if (!trimmed) {
      return
    }

    dispatchPlanner({
      type: 'add-organizer-item',
      listName,
      id: createLocalId(listName),
      text: trimmed,
    })

    if (listName === 'groceryItems') {
      setGroceryText('')
      showNotice(`${trimmed} added to groceries.`)
    } else {
      setTodoText('')
      showNotice(`${trimmed} added to family to-dos.`)
    }
  }

  const toggleOrganizerItem = (
    listName: OrganizerItemListName,
    itemId: string,
  ) => {
    dispatchPlanner({ type: 'toggle-organizer-item', listName, itemId })
  }

  const removeOrganizerItem = (
    listName: OrganizerItemListName,
    itemId: string,
  ) => {
    const item = organizer[listName].find((entry) => entry.id === itemId)

    if (!item) {
      return
    }

    dispatchPlanner({ type: 'remove-organizer-item', listName, itemId })
    showNotice(`${item.text} removed.`, () => {
      dispatchPlanner({
        type: 'add-organizer-item',
        listName,
        id: item.id,
        text: item.text,
      })

      if (item.completed) {
        dispatchPlanner({ type: 'toggle-organizer-item', listName, itemId: item.id })
      }
    })
  }

  const addMealPlanEntry = () => {
    const dayLabel = mealDayText.trim()
    const meal = mealText.trim()

    if (!dayLabel || !meal) {
      return
    }

    dispatchPlanner({
      type: 'add-meal',
      entry: {
        id: createLocalId('meal'),
        dayLabel,
        meal,
        notes: mealNotesText.trim() || undefined,
      },
    })
    setMealDayText('')
    setMealText('')
    setMealNotesText('')
    showNotice(`${meal} added to the meal plan.`)
  }

  const removeMealPlanEntry = (entryId: string) => {
    const entry = organizer.mealPlan.find((item) => item.id === entryId)

    if (!entry) {
      return
    }

    dispatchPlanner({ type: 'remove-meal', entryId })
    showNotice(`${entry.meal} removed.`, () =>
      dispatchPlanner({ type: 'add-meal', entry }),
    )
  }

  const addFamilyNote = () => {
    const title = noteTitleText.trim()
    const body = noteBodyText.trim()

    if (!title || !body) {
      return
    }

    dispatchPlanner({
      type: 'add-note',
      note: { id: createLocalId('note'), title, body },
    })
    setNoteTitleText('')
    setNoteBodyText('')
    showNotice(`${title} added to handoff notes.`)
  }

  const removeFamilyNote = (noteId: string) => {
    const note = organizer.notes.find((item) => item.id === noteId)

    if (!note) {
      return
    }

    dispatchPlanner({ type: 'remove-note', noteId })
    showNotice(`${note.title} removed.`, () =>
      dispatchPlanner({ type: 'add-note', note }),
    )
  }

  const toggleBlockedActivity = (activityId: string) => {
    const activity = activityById.get(activityId)
    const willBlock = !household.blockedActivityIds.includes(activityId)

    dispatchPlanner({ type: 'toggle-blocked-activity', activityId })
    showNotice(
      `${activity?.title ?? 'Activity'} ${willBlock ? 'blocked' : 'unblocked'}.`,
    )
  }

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'kidrhythm-planner-backup.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setBackupMessage('Backup download requested. It contains family details; keep the file private and check it downloaded before closing this page.')
  }

  const restoreBackup = async (file: File | undefined) => {
    if (!file) return
    if (!initial.canPersist) {
      setBackupMessage('Restore is blocked while saved data cannot be read. Preserve the original browser data for recovery; export this temporary view separately if needed.')
      return
    }
    if (file.size > MAX_BACKUP_BYTES) {
      setBackupMessage('Backup must be no larger than 1 MB. Nothing was replaced.')
      return
    }
    try {
      const restored = parsePlannerBackup(await file.text())
      if (!window.confirm('Replace this device’s current planner with the selected backup? Download a backup of your current plan first if you need to keep it.')) return
      setAppState(restored)
      setBackupMessage('Backup loaded into this planner. Check the storage status above to confirm whether it was saved on this device.')
    } catch {
      setBackupMessage('This file could not be read as a valid planner backup. Nothing was replaced.')
    }
  }

  const resetLocalData = () => {
    const confirmed = window.confirm(
      'Reset every child profile, schedule item, family list, and preference on this device?',
    )

    if (!confirmed) {
      return
    }

    if (!initial.canPersist) {
      showNotice('Saved data is protected while it cannot be read. No stored data was changed.')
      return
    }
    setAppState(createEmptyAppState())
    showNotice('Planner cleared on this device.')
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand-link" href="/">
            <img className="planner-brand-logo" src="/favicon.svg" alt="" width="44" height="44" />
            <span>KidRhythm</span>
          </a>
          <nav className="site-nav" aria-label="Primary">
            <a href="/">Home</a>
            <a href="#today">Planner</a>
            <a href="#schedule">Schedule</a>
            <a href="#family-hub">Family Hub</a>
            <a href="#household">Household</a>
            <a href="/privacy.html">Privacy</a>
          </nav>
          <div className="account-actions">
            <span className="header-badge">{householdName}</span>

          </div>
        </div>
      </header>

      <section className="local-device-notice" aria-label="Local device privacy">
        <p>For parents and caregivers. This planner stays in this browser, without cloud sync or an account lock. Anyone using this browser profile can open it.</p>
        {storageWarning ? <p role="alert">{storageWarning}</p> : null}
        {appState.dataOrigin === 'sample' ? <p><strong>Sample household:</strong> Mara, Leo, routines and feedback are examples. Replace these with your own details or clear the planner before using it for your family.</p> : null}
        <details className="planner-privacy">
          <summary>Privacy and backups</summary>
          <p>Use initials rather than sensitive names or notes. Clearing site data or using another device will not restore your planner. This is local browser storage, without an encrypted vault, online account or password protection.</p>
        <div className="planner-backup">
          <h2>Private local backup</h2>
          <p>Backups contain family planner details. Keep them private. Only planner data is included, without legacy account email or passcode records. Restoring replaces this device’s current plan after confirmation.</p>
          <button type="button" className="secondary" onClick={downloadBackup}>Download private planner backup</button>
          <label className="field"><span>Restore planner backup (JSON, up to 1 MB)</span><input type="file" accept="application/json,.json" disabled={!initial.canPersist} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void restoreBackup(file) }} /></label>
          {!initial.canPersist ? <p>Restore is blocked to preserve unreadable saved data. Keep this browser profile and its site data intact for recovery.</p> : null}
          {backupMessage ? <p role="status">{backupMessage}</p> : null}
        </div>
        </details>
      </section>

      {!household.children.length || !appState.schedule.length ? <section className="planner-first-use" aria-label="Get started">
        <h2>Start your daily routine</h2>
        <div className="first-use-actions">
          <a href="#household">1. Add your child</a>
          <a href="#schedule">2. Create your routine</a>
        </div>
        {!household.children.length && !appState.schedule.length && !organizer.groceryItems.length && !organizer.todoItems.length && !organizer.notes.length && !organizer.mealPlan.length && !household.feedback.length && !household.availableSupplies.length && !household.blockedActivityIds.length && !household.recentlyCompleted.length ? <p>
          Start with your own child profile and schedule below, or <button type="button" className="secondary" onClick={() => { setAppState(createDefaultAppState()); showNotice('Example household loaded. Mara, Leo, feedback and routines are sample data; edit or clear them before planning for your family.') }}>Load a clearly labeled sample household</button>
        </p> : null}
      </section> : null}

      <section className="hero-band" id="today" aria-label="Today summary">
        <div className="hero-copy">
          <p className="eyebrow">Family rhythm planner</p>
          <h1>A calmer rhythm for {householdName}</h1>
          <p className="hero-text">
            Plan the day, keep household lists close, and pick the next activity
            from what fits your kids right now.
          </p>
          <div className="household-strip" role="list" aria-label="Household">
            {household.children.map((child) => (
              <span key={child.id} role="listitem">
                {child.name}, {child.age}
              </span>
            ))}
          </div>
        </div>
        <div className="hero-summary-card">
          <span className="summary-label">Next up</span>
          <strong>{primary?.activity.title ?? (household.children.length ? 'Choose what fits your day' : 'Your plan starts here')}</strong>
          <p>{activeBlock?.label ?? 'Create a flexible routine block'}</p>
          <div className="summary-meta">
            <span>{formatTime(nowMinutes)}</span>
            {activeBlock ? <span>{availableMinutes} min</span> : <span>No routine block yet</span>}
            <span>{desiredEnergy}</span>
          </div>
        </div>
      </section>

      <section className="control-band" aria-label="Recommendation context">
        <label className="field">
          <span>Time</span>
          <input type="time" value={timeInput(nowMinutes)} onChange={(event) => {
            if (!event.target.value) return
            setUseCurrentTime(false)
            setNowMinutes(toMinutes(event.target.value))
          }} />
          <button type="button" className="secondary" onClick={() => { setUseCurrentTime(true); setNowMinutes(currentMinutes()) }}>
            Use current time
          </button>
          <small>{useCurrentTime ? 'Following this device’s clock' : 'Planning at a custom time'}</small>
        </label>

        <SegmentedControl
          label="Energy"
          options={energyOptions}
          value={desiredEnergy}
          onChange={setDesiredEnergy}
        />

        <SegmentedControl
          label="Parent"
          options={supervisionOptions}
          value={supervision}
          onChange={setSupervision}
        />

        <SegmentedControl
          label="Place"
          options={settingOptions}
          value={setting}
          onChange={setSetting}
        />
      </section>

      <div className="workspace">
        <section className="primary-panel" aria-label="Current recommendation">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Fit for right now</p>
              <h2>{primary?.activity.title ?? (household.children.length ? 'No activity fits these settings' : 'Add your child to begin')}</h2>
            </div>
            {primary ? <span className="fit-badge">Best fit</span> : null}
          </div>

          {primary ? (
            <>
              <p className="activity-description">{primary.activity.description}</p>

              <div className="metric-grid">
                <Metric label="Window" value={`${availableMinutes} min`} />
                <Metric
                  label="Duration"
                  value={`${primary.activity.duration.min}-${primary.activity.duration.max} min`}
                />
                <Metric label="Energy" value={primary.activity.energy} />
                <Metric label="Parent" value={primary.activity.supervision} />
              </div>

              <div className="reason-list" aria-label="Recommendation reasons">
                {primary.reasons.map((reason) => (
                  <span key={reason}>{reason}</span>
                ))}
              </div>

              <div className="action-row">
                <button type="button" onClick={() => startActivity(primary.activity)}>
                  Start
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => scheduleActivity(primary.activity)}
                >
                  Schedule
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSelectedActivityId(primary.activity.id)}
                >
                  Details
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => recordFeedback(primary.activity, 'try-later')}
                >
                  Later
                </button>
              </div>

              <div className="feedback-row" aria-label="Feedback">
                <button
                  type="button"
                  onClick={() => recordFeedback(primary.activity, 'worked')}
                >
                  Worked
                </button>
                <button
                  type="button"
                  onClick={() => recordFeedback(primary.activity, 'too-messy')}
                >
                  Too messy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    recordFeedback(primary.activity, 'too-much-supervision')
                  }
                >
                  Too much help
                </button>
              </div>

              {primary.cautions.length > 0 ? (
                <ul className="caution-list">
                  {primary.cautions.map((caution) => (
                    <li key={caution}>{caution}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="activity-description">
              {household.children.length ? 'No activity fits the current age, supplies, time, place, and supervision constraints.' : 'Add your child profile and supplies below to see activities that fit your family.'}
            </p>
          )}
        </section>

        <aside className="side-stack">
          <InsightsPanel cards={insightCards} />
          <SchedulePanel
            activityById={activityById}
            activeBlock={activeBlock}
            nowMinutes={nowMinutes}
            schedule={appState.schedule}
            onSave={(block) => {
              try {
                const schedule = editSchedule(appState.schedule, block)
                setAppState((current) => ({ ...current, schedule }))
                return null
              } catch (error) {
                return error instanceof Error ? error.message : 'This schedule could not be changed.'
              }
            }}
            onRemove={(blockId) => setAppState((current) => ({ ...current, schedule: current.schedule.filter((block) => block.id !== blockId) }))}
          />
          <ActivityDetail
            activity={selectedActivity}
            blocked={selectedActivityBlocked}
            onBlockToggle={() => toggleBlockedActivity(selectedActivity.id)}
            onSchedule={() => scheduleActivity(selectedActivity)}
          />
        </aside>
      </div>

      <FamilyHubPanel
        groceryItems={organizer.groceryItems}
        groceryText={groceryText}
        mealDayText={mealDayText}
        mealNotesText={mealNotesText}
        mealPlan={organizer.mealPlan}
        mealText={mealText}
        noteBodyText={noteBodyText}
        noteTitleText={noteTitleText}
        notes={organizer.notes}
        todoItems={organizer.todoItems}
        todoText={todoText}
        onAddGrocery={() => addOrganizerItem('groceryItems', groceryText)}
        onAddMeal={addMealPlanEntry}
        onAddNote={addFamilyNote}
        onAddTodo={() => addOrganizerItem('todoItems', todoText)}
        onGroceryTextChange={setGroceryText}
        onMealDayTextChange={setMealDayText}
        onMealNotesTextChange={setMealNotesText}
        onMealTextChange={setMealText}
        onNoteBodyTextChange={setNoteBodyText}
        onNoteTitleTextChange={setNoteTitleText}
        onTodoTextChange={setTodoText}
        onRemoveGrocery={(itemId) =>
          removeOrganizerItem('groceryItems', itemId)
        }
        onRemoveMeal={removeMealPlanEntry}
        onRemoveNote={removeFamilyNote}
        onRemoveTodo={(itemId) => removeOrganizerItem('todoItems', itemId)}
        onToggleGrocery={(itemId) =>
          toggleOrganizerItem('groceryItems', itemId)
        }
        onToggleTodo={(itemId) => toggleOrganizerItem('todoItems', itemId)}
      />

      <section
        className="settings-band"
        id="household"
        tabIndex={-1}
        aria-label="Household setup"
      >
        <div className="settings-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Whole-child profile</p>
              <h2>Children</h2>
            </div>
            <button type="button" className="secondary" onClick={addChild}>
              Add
            </button>
          </div>

          <div className="child-list">
            {household.children.map((child) => (
              <article key={child.id} className="child-card">
                <div className="child-row">
                  <label>
                    <span>Name</span>
                    <input
                      value={child.name}
                      onChange={(event) =>
                        updateChild(child.id, { name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Age</span>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={child.age}
                      onChange={(event) =>
                        updateChild(child.id, {
                          age: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => removeChild(child.id)}
                  >
                    Remove
                  </button>
                </div>

                <div className="signal-grid">
                  <label>
                    <span>Energy</span>
                    <select
                      value={child.signals.preferredEnergy}
                      onChange={(event) =>
                        updateChildSignals(child.id, {
                          preferredEnergy: event.target.value as EnergyLevel,
                        })
                      }
                    >
                      {energyOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Transitions</span>
                    <select
                      value={child.signals.transitionNeed}
                      onChange={(event) =>
                        updateChildSignals(child.id, {
                          transitionNeed: event.target.value as TransitionNeed,
                        })
                      }
                    >
                      {transitionOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Independence</span>
                    <select
                      value={child.signals.independence}
                      onChange={(event) =>
                        updateChildSignals(child.id, {
                          independence: event.target.value as IndependenceNeed,
                        })
                      }
                    >
                      {independenceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Mess tolerance</span>
                    <select
                      value={child.signals.messTolerance}
                      onChange={(event) =>
                        updateChildSignals(child.id, {
                          messTolerance: event.target.value as BurdenLevel,
                        })
                      }
                    >
                      {messToleranceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Sensory</span>
                    <select
                      value={child.signals.sensoryNeed}
                      onChange={(event) =>
                        updateChildSignals(child.id, {
                          sensoryNeed: event.target.value as SensoryNeed,
                        })
                      }
                    >
                      {sensoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="interest-grid" aria-label={`${child.name} interests`}>
                  {categoryOptions.map((category) => (
                    <label key={category} className="check-tile">
                      <input
                        type="checkbox"
                        checked={child.signals.interests.includes(category)}
                        onChange={() => toggleChildInterest(child.id, category)}
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="settings-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Supplies</p>
              <h2>Available</h2>
            </div>
            <button type="button" className="secondary" onClick={resetLocalData}>
              Reset all data…
            </button>
          </div>

          <div className="supply-grid">
            {allSupplies.map((supply) => (
              <label key={supply} className="check-tile">
                <input
                  type="checkbox"
                  checked={household.availableSupplies.includes(supply)}
                  onChange={() => toggleSupply(supply)}
                />
                <span>{supply}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section
        className="alternate-band"
        id="activities"
        aria-label="Alternate activities"
      >
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Alternates</p>
            <h2>Backup options</h2>
          </div>
        </div>

        <div className="activity-grid">
          {alternates.map((item) => (
            <article key={item.activity.id} className="activity-card">
              <div>
                <h3>{item.activity.title}</h3>
                <p>{item.activity.description}</p>
              </div>
              <div className="card-footer">
                <span>{item.activity.energy}</span>
                <span>{item.activity.supervision}</span>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSelectedActivityId(item.activity.id)}
                >
                  Details
                </button>
                <button type="button" onClick={() => scheduleActivity(item.activity)}>
                  Add
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {notice ? (
        <div key={notice.id} className="state-notice" role="status" aria-live="polite">
          <span>{notice.message}</span>
          {notice.onUndo ? (
            <button type="button" className="notice-action" onClick={undoNotice}>
              Undo
            </button>
          ) : null}
          <button
            type="button"
            className="notice-dismiss"
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      ) : null}
    </main>
  )
}

interface InsightCard {
  label: string
  value: string
  detail: string
}

interface InsightsPanelProps {
  cards: InsightCard[]
}

function InsightsPanel({ cards }: InsightsPanelProps) {
  return (
    <section className="insights-panel" aria-label="Whole-child insights">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Signals</p>
          <h2>Whole-child fit</h2>
        </div>
      </div>
      <div className="insight-list">
        {cards.map((card) => (
          <article key={`${card.label}-${card.value}`} className="insight-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function buildInsightCards(household: HouseholdProfile): InsightCard[] {
  const firstChild = household.children[0]

  if (!firstChild) {
    return [
      {
        label: 'Profile',
        value: 'No child profile',
        detail: 'Add a child to start tailoring routines.',
      },
    ]
  }

  return [
    {
      label: 'Energy',
      value: summarizeChildSignal(
        household.children,
        (child) => child.signals.preferredEnergy,
      ),
      detail: `Recommendations compare the current energy target with ${listChildSignals(
        household.children,
        (child) => child.signals.preferredEnergy,
      )}.`,
    },
    {
      label: 'Transitions',
      value: summarizeChildSignal(
        household.children,
        (child) => child.signals.transitionNeed,
      ),
      detail: household.children.some(
        (child) => child.signals.transitionNeed === 'sensitive',
      )
        ? 'Sensitive transitions get low setup and low cleanup boosts.'
        : `Routine fit still accounts for ${listChildSignals(
            household.children,
            (child) => child.signals.transitionNeed,
          )}.`,
    },
    {
      label: 'Interests',
      value: summarizeInterests(household.children),
      detail: `Interest matches are ranked higher across ${listChildSignals(
        household.children,
        (child) => child.signals.interests.slice(0, 2).join(', ') || 'open',
      )}.`,
    },
  ]
}

function summarizeChildSignal(
  children: ChildProfile[],
  readSignal: (child: ChildProfile) => string,
): string {
  return Array.from(new Set(children.map(readSignal))).join(' + ')
}

function summarizeInterests(children: ChildProfile[]): string {
  return (
    Array.from(new Set(children.flatMap((child) => child.signals.interests)))
      .slice(0, 3)
      .join(', ') || 'open'
  )
}

function listChildSignals(
  children: ChildProfile[],
  readSignal: (child: ChildProfile) => string,
): string {
  return children.map((child) => `${child.name}: ${readSignal(child)}`).join('; ')
}

interface SchedulePanelProps {
  activityById: Map<string, Activity>
  activeBlock: ScheduleBlock | undefined
  nowMinutes: number
  schedule: ScheduleBlock[]
  onSave: (block: ScheduleBlock) => string | null
  onRemove: (blockId: string) => void
}

function SchedulePanel({
  activityById,
  activeBlock,
  nowMinutes,
  schedule,
  onSave,
  onRemove,
}: SchedulePanelProps) {
  const [editing, setEditing] = useState<ScheduleBlock | null>(null)
  const [label, setLabel] = useState('')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('09:30')
  const [fixed, setFixed] = useState(false)
  const [error, setError] = useState('')
  const clearEditor = () => { setEditing(null); setLabel(''); setError(''); setFixed(false) }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const message = onSave({
        ...editing,
        id: editing?.id ?? createLocalId('block'),
        label,
        startMinutes: toMinutes(start),
        endMinutes: toMinutes(end),
        type: fixed ? 'fixed' : 'open',
        assignedActivityId: fixed ? undefined : editing?.assignedActivityId,
        locked: fixed,
        status: editing?.status ?? 'planned',
      })
      if (message) setError(message)
      else clearEditor()
    } catch {
      setError('Enter a valid start and end time.')
    }
  }
  return (
    <section className="schedule-panel" id="schedule" tabIndex={-1} aria-label="Daily routine template">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Daily routine template</p>
          <h2>{formatTime(nowMinutes)}</h2>
        </div>
      </div>

      <p>This is a reusable daily template on this device, not a dated calendar. Blocks do not send reminders or sync to a calendar.</p>
      <form onSubmit={save} className="routine-editor" aria-label="Schedule editor">
        <label className="field"><span>Block name</span><input required maxLength={100} value={label} onChange={(event) => setLabel(event.target.value)} /></label>
        <label className="field"><span>Start time</span><input required type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label className="field"><span>End time</span><input required type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        <label><input type="checkbox" checked={fixed} onChange={(event) => setFixed(event.target.checked)} /> Fixed commitment (keep activity suggestions out)</label>
        <button type="submit">{editing ? 'Save block changes' : 'Add schedule block'}</button>
        {editing ? <button type="button" className="secondary" onClick={clearEditor}>Cancel editing</button> : null}
        {error ? <p role="alert">{error}</p> : null}
      </form>
      {!schedule.length ? <p>No schedule blocks yet. Add your first routine above.</p> : null}
      <ol className="timeline">
        {schedule.map((block) => {
          const assignedActivity = block.assignedActivityId
            ? activityById.get(block.assignedActivityId)
            : undefined
          const isActive = block.id === activeBlock?.id

          return (
            <li
              key={block.id}
              className={isActive ? 'timeline-item active' : 'timeline-item'}
            >
              <span className="time-range">
                {formatTime(block.startMinutes)} - {formatTime(block.endMinutes)}
              </span>
              <strong>{block.label}</strong>
              <span>{assignedActivity?.title ?? block.status}</span>
              <div className="action-row">
                <button type="button" className="secondary" aria-label={`Edit ${block.label}`} onClick={() => { setEditing(block); setLabel(block.label); setStart(timeInput(block.startMinutes)); setEnd(timeInput(block.endMinutes)); setFixed(block.locked); setError('') }}>Edit</button>
                <button type="button" className="secondary" aria-label={`Remove ${block.label}`} onClick={() => { if (window.confirm(`Remove “${block.label}” from this routine?`)) { onRemove(block.id); if (editing?.id === block.id) clearEditor() } }}>Remove</button>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

interface FamilyHubPanelProps {
  groceryItems: OrganizerItem[]
  groceryText: string
  mealDayText: string
  mealNotesText: string
  mealPlan: MealPlanEntry[]
  mealText: string
  noteBodyText: string
  noteTitleText: string
  notes: FamilyOrganizer['notes']
  todoItems: OrganizerItem[]
  todoText: string
  onAddGrocery: () => void
  onAddMeal: () => void
  onAddNote: () => void
  onAddTodo: () => void
  onGroceryTextChange: (value: string) => void
  onMealDayTextChange: (value: string) => void
  onMealNotesTextChange: (value: string) => void
  onMealTextChange: (value: string) => void
  onNoteBodyTextChange: (value: string) => void
  onNoteTitleTextChange: (value: string) => void
  onTodoTextChange: (value: string) => void
  onRemoveGrocery: (itemId: string) => void
  onRemoveMeal: (entryId: string) => void
  onRemoveNote: (noteId: string) => void
  onRemoveTodo: (itemId: string) => void
  onToggleGrocery: (itemId: string) => void
  onToggleTodo: (itemId: string) => void
}

function FamilyHubPanel({
  groceryItems,
  groceryText,
  mealDayText,
  mealNotesText,
  mealPlan,
  mealText,
  noteBodyText,
  noteTitleText,
  notes,
  todoItems,
  todoText,
  onAddGrocery,
  onAddMeal,
  onAddNote,
  onAddTodo,
  onGroceryTextChange,
  onMealDayTextChange,
  onMealNotesTextChange,
  onMealTextChange,
  onNoteBodyTextChange,
  onNoteTitleTextChange,
  onTodoTextChange,
  onRemoveGrocery,
  onRemoveMeal,
  onRemoveNote,
  onRemoveTodo,
  onToggleGrocery,
  onToggleTodo,
}: FamilyHubPanelProps) {
  return (
    <section className="family-hub" id="family-hub" aria-label="Family organizer">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Family hub</p>
          <h2>Household organizer</h2>
        </div>
        <span className="local-badge">Free local data</span>
      </div>

      <div className="hub-grid">
        <article className="hub-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">List</p>
              <h3>Groceries</h3>
            </div>
          </div>
          <OrganizerList
            emptyLabel="No grocery items"
            items={groceryItems}
            onRemove={onRemoveGrocery}
            onToggle={onToggleGrocery}
          />
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              onAddGrocery()
            }}
          >
            <label>
              <span>Grocery item</span>
              <input
                value={groceryText}
                onChange={(event) => onGroceryTextChange(event.target.value)}
              />
            </label>
            <button type="submit">Add</button>
          </form>
        </article>

        <article className="hub-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Tasks</p>
              <h3>Family to-dos</h3>
            </div>
          </div>
          <OrganizerList
            emptyLabel="No to-dos"
            items={todoItems}
            onRemove={onRemoveTodo}
            onToggle={onToggleTodo}
          />
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              onAddTodo()
            }}
          >
            <label>
              <span>To-do</span>
              <input
                value={todoText}
                onChange={(event) => onTodoTextChange(event.target.value)}
              />
            </label>
            <button type="submit">Add</button>
          </form>
        </article>

        <article className="hub-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Meals</p>
              <h3>Meal plan</h3>
            </div>
          </div>
          <div className="meal-list">
            {mealPlan.length > 0 ? (
              mealPlan.map((entry) => (
                <div key={entry.id} className="meal-item">
                  <div>
                    <span>{entry.dayLabel}</span>
                    <strong>{entry.meal}</strong>
                    {entry.notes ? <p>{entry.notes}</p> : null}
                  </div>
                  <button
                    type="button"
                    className="secondary compact-button"
                    onClick={() => onRemoveMeal(entry.id)}
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-state">No meals planned</p>
            )}
          </div>
          <form
            className="stacked-form"
            onSubmit={(event) => {
              event.preventDefault()
              onAddMeal()
            }}
          >
            <div className="two-field-row">
              <label>
                <span>Day</span>
                <input
                  value={mealDayText}
                  onChange={(event) => onMealDayTextChange(event.target.value)}
                />
              </label>
              <label>
                <span>Meal</span>
                <input
                  value={mealText}
                  onChange={(event) => onMealTextChange(event.target.value)}
                />
              </label>
            </div>
            <label>
              <span>Note</span>
              <input
                value={mealNotesText}
                onChange={(event) => onMealNotesTextChange(event.target.value)}
              />
            </label>
            <button type="submit">Add meal</button>
          </form>
        </article>

        <article className="hub-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Notes</p>
              <h3>Handoff</h3>
            </div>
          </div>
          <div className="note-list">
            {notes.length > 0 ? (
              notes.map((note) => (
                <div key={note.id} className="note-item">
                  <div>
                    <strong>{note.title}</strong>
                    <p>{note.body}</p>
                  </div>
                  <button
                    type="button"
                    className="secondary compact-button"
                    onClick={() => onRemoveNote(note.id)}
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-state">No handoff notes</p>
            )}
          </div>
          <form
            className="stacked-form"
            onSubmit={(event) => {
              event.preventDefault()
              onAddNote()
            }}
          >
            <label>
              <span>Title</span>
              <input
                value={noteTitleText}
                onChange={(event) => onNoteTitleTextChange(event.target.value)}
              />
            </label>
            <label>
              <span>Note</span>
              <textarea
                rows={3}
                value={noteBodyText}
                onChange={(event) => onNoteBodyTextChange(event.target.value)}
              />
            </label>
            <button type="submit">Add note</button>
          </form>
        </article>
      </div>
    </section>
  )
}

interface OrganizerListProps {
  emptyLabel: string
  items: OrganizerItem[]
  onRemove: (itemId: string) => void
  onToggle: (itemId: string) => void
}

function OrganizerList({
  emptyLabel,
  items,
  onRemove,
  onToggle,
}: OrganizerListProps) {
  if (items.length === 0) {
    return <p className="empty-state">{emptyLabel}</p>
  }

  return (
    <ul className="organizer-list">
      {items.map((item) => (
        <li key={item.id} className={item.completed ? 'completed' : ''}>
          <label>
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => onToggle(item.id)}
            />
            <span>{item.text}</span>
          </label>
          <button
            type="button"
            className="secondary compact-button"
            onClick={() => onRemove(item.id)}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  )
}

interface ActivityDetailProps {
  activity: Activity
  blocked: boolean
  onBlockToggle: () => void
  onSchedule: () => void
}

function ActivityDetail({
  activity,
  blocked,
  onBlockToggle,
  onSchedule,
}: ActivityDetailProps) {
  return (
    <section className="detail-panel" aria-label="Activity detail">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Activity</p>
          <h2>{activity.title}</h2>
        </div>
      </div>
      <p className="activity-description">{activity.description}</p>
      <dl className="detail-list">
        <div>
          <dt>Supplies</dt>
          <dd>{activity.supplies.join(', ') || 'none'}</dd>
        </div>
        <div>
          <dt>Setup</dt>
          <dd>{activity.setupBurden}</dd>
        </div>
        <div>
          <dt>Cleanup</dt>
          <dd>{activity.cleanupBurden}</dd>
        </div>
        <div>
          <dt>Safety</dt>
          <dd>{activity.safetyNotes || 'standard parent judgment'}</dd>
        </div>
      </dl>
      <div className="action-row">
        <button type="button" onClick={onSchedule}>
          Schedule
        </button>
        <button type="button" className="secondary" onClick={onBlockToggle}>
          {blocked ? 'Unblock' : 'Block'}
        </button>
      </div>
    </section>
  )
}

interface MetricProps {
  label: string
  value: string
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

interface SegmentedControlProps<T extends string> {
  label: string
  options: T[]
  value: T
  onChange: (value: T) => void
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="segmented">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={option === value ? 'selected' : ''}
            aria-pressed={option === value}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`
}

function getBrowserStorage(): StorageLike | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

function currentMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function timeInput(minutes: number): string {
  return `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`
}

export default App
