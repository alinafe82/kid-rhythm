import { type FormEvent, useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  clearSession,
  createLocalAccount,
  createSession,
  loadAccount,
  loadSession,
  saveAccount,
  saveSession,
  validateAccountInput,
  verifyPasscode,
  type AccountInput,
  type AccountSession,
  type LocalAccount,
} from './data/account'
import {
  clearAppState,
  createDefaultChildSignals,
  createDefaultAppState,
  loadAppState,
  saveAppState,
  type AppState,
  type StorageLike,
} from './data/appState'
import { demoNowMinutes } from './data/demoHousehold'
import { seedActivities } from './data/seedActivities'
import {
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

const timeOptions = [
  { label: '9:20 AM', value: toMinutes('09:20') },
  { label: '1:10 PM', value: demoNowMinutes },
  { label: '3:05 PM', value: toMinutes('15:05') },
]

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

type AuthState = {
  account: LocalAccount | null
  session: AccountSession | null
}

const emptyAccountForm: AccountInput = {
  householdName: '',
  email: '',
  passcode: '',
}

function App() {
  const [authState, setAuthState] = useState<AuthState>(() =>
    loadInitialAuth(getBrowserStorage()),
  )
  const [accountForm, setAccountForm] = useState<AccountInput>(() => ({
    householdName: authState.account?.householdName ?? emptyAccountForm.householdName,
    email: authState.account?.email ?? emptyAccountForm.email,
    passcode: '',
  }))
  const [authError, setAuthError] = useState('')

  const updateAccountForm = (patch: Partial<AccountInput>) => {
    setAuthError('')
    setAccountForm((current) => ({ ...current, ...patch }))
  }

  const createAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationMessage = validateAccountInput(accountForm)

    if (validationMessage) {
      setAuthError(validationMessage)
      return
    }

    const account = createLocalAccount(accountForm)
    const session = createSession(account)
    const storage = getBrowserStorage()

    saveAccount(storage, account)
    saveSession(storage, session)
    setAuthState({ account, session })
    setAccountForm({
      householdName: account.householdName,
      email: account.email,
      passcode: '',
    })
    setAuthError('')
  }

  const signIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!authState.account) {
      setAuthError('Create a household account first.')
      return
    }

    if (
      !verifyPasscode(authState.account, accountForm.email, accountForm.passcode)
    ) {
      setAuthError('Email or passcode did not match.')
      return
    }

    const session = createSession(authState.account)

    saveSession(getBrowserStorage(), session)
    setAuthState((current) => ({ ...current, session }))
    setAccountForm((current) => ({ ...current, passcode: '' }))
    setAuthError('')
  }

  const signOut = () => {
    clearSession(getBrowserStorage())

    setAuthState((current) => ({ account: current.account, session: null }))
    setAccountForm({
      householdName: authState.account?.householdName ?? '',
      email: authState.account?.email ?? '',
      passcode: '',
    })
    setAuthError('')
  }

  if (!authState.account || !authState.session) {
    return (
      <AccountGate
        account={authState.account}
        error={authError}
        form={accountForm}
        onCreate={createAccount}
        onFormChange={updateAccountForm}
        onSignIn={signIn}
      />
    )
  }

  return <PlannerApp account={authState.account} onSignOut={signOut} />
}

interface PlannerAppProps {
  account: LocalAccount
  onSignOut: () => void
}

function PlannerApp({ account, onSignOut }: PlannerAppProps) {
  const [appState, setAppState] = useState<AppState>(() =>
    loadAppState(getBrowserStorage()),
  )
  const [nowMinutes, setNowMinutes] = useState(demoNowMinutes)
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

  useEffect(() => {
    saveAppState(getBrowserStorage(), appState)
  }, [appState])

  const activityById = useMemo(
    () => new Map(seedActivities.map((activity) => [activity.id, activity])),
    [],
  )

  const activeBlock =
    findCurrentBlock(appState.schedule, nowMinutes) ??
    findNextFlexibleBlock(appState.schedule, nowMinutes)
  const availableMinutes = getAvailableMinutes(activeBlock, nowMinutes)
  const household = appState.household
  const organizer = appState.organizer

  const recommendations = useMemo(
    () =>
      rankActivities(seedActivities, household, {
        nowMinutes,
        availableMinutes,
        desiredEnergy,
        supervisionAvailability: supervision,
        setting,
        currentBlock: activeBlock,
      }),
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

  const recordFeedback = (activity: Activity, rating: FeedbackRating) => {
    dispatchPlanner({
      type: 'record-feedback',
      activity,
      rating,
      nowMinutes,
      timestamp: new Date().toISOString(),
    })
  }

  const scheduleActivity = (activity: Activity) => {
    if (!activeBlock) {
      return
    }

    setSelectedActivityId(activity.id)
    dispatchPlanner({
      type: 'schedule-activity',
      blockId: activeBlock.id,
      activityId: activity.id,
    })
  }

  const startActivity = (activity: Activity) => {
    if (!activeBlock) {
      return
    }

    setSelectedActivityId(activity.id)
    dispatchPlanner({
      type: 'start-activity',
      blockId: activeBlock.id,
      activityId: activity.id,
    })
  }

  const updateChild = (childId: string, patch: Partial<ChildProfile>) => {
    dispatchPlanner({ type: 'update-child', childId, patch })
  }

  const addChild = () => {
    dispatchPlanner({
      type: 'add-child',
      child: {
        id: `child-${Date.now()}`,
        name: 'New child',
        age: 6,
        signals: createDefaultChildSignals(),
      },
    })
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
    dispatchPlanner({ type: 'remove-child', childId })
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
    } else {
      setTodoText('')
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
    dispatchPlanner({ type: 'remove-organizer-item', listName, itemId })
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
  }

  const removeMealPlanEntry = (entryId: string) => {
    dispatchPlanner({ type: 'remove-meal', entryId })
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
  }

  const removeFamilyNote = (noteId: string) => {
    dispatchPlanner({ type: 'remove-note', noteId })
  }

  const toggleBlockedActivity = (activityId: string) => {
    dispatchPlanner({ type: 'toggle-blocked-activity', activityId })
  }

  const resetLocalData = () => {
    clearAppState(getBrowserStorage())
    setAppState(createDefaultAppState())
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand-link" href="#today" aria-label="KidRhythm home">
            <span className="brand-mark">K</span>
            <span>KidRhythm</span>
          </a>
          <nav className="site-nav" aria-label="Primary">
            <a href="#today">Today</a>
            <a href="#schedule">Schedule</a>
            <a href="#family-hub">Family Hub</a>
            <a href="#household">Household</a>
          </nav>
          <div className="account-actions">
            <span className="header-badge">{account.householdName}</span>
            <button
              type="button"
              className="secondary sign-out-button"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="hero-band" id="today" aria-label="Today summary">
        <div className="hero-copy">
          <p className="eyebrow">Family rhythm planner</p>
          <h1>A calmer rhythm for {account.householdName}</h1>
          <p className="hero-text">
            Plan the day, keep household lists close, and pick the next activity
            from what fits your kids right now.
          </p>
          <div className="household-strip" aria-label="Household">
            {household.children.map((child) => (
              <span key={child.id}>
                {child.name}, {child.age}
              </span>
            ))}
          </div>
        </div>
        <div className="hero-summary-card">
          <span className="summary-label">Next up</span>
          <strong>{primary?.activity.title ?? 'No strong match'}</strong>
          <p>{activeBlock?.label ?? 'Open family time'}</p>
          <div className="summary-meta">
            <span>{formatTime(nowMinutes)}</span>
            <span>{availableMinutes} min</span>
            <span>{desiredEnergy}</span>
          </div>
        </div>
      </section>

      <section className="control-band" aria-label="Recommendation context">
        <label className="field">
          <span>Time</span>
          <select
            value={nowMinutes}
            onChange={(event) => setNowMinutes(Number(event.target.value))}
          >
            {timeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
              <h2>{primary?.activity.title ?? 'No strong match'}</h2>
            </div>
            <span className="score">{primary?.score ?? 0}</span>
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
              No activity fits the current age, supplies, time, place, and
              supervision constraints.
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
              Reset
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
    </main>
  )
}

interface AccountGateProps {
  account: LocalAccount | null
  error: string
  form: AccountInput
  onCreate: (event: FormEvent<HTMLFormElement>) => void
  onFormChange: (patch: Partial<AccountInput>) => void
  onSignIn: (event: FormEvent<HTMLFormElement>) => void
}

function AccountGate({
  account,
  error,
  form,
  onCreate,
  onFormChange,
  onSignIn,
}: AccountGateProps) {
  const isSignIn = Boolean(account)

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-panel">
          <div className="brand-link" aria-label="KidRhythm">
            <span className="brand-mark">K</span>
            <span>KidRhythm</span>
          </div>
          <p className="eyebrow">Parent account</p>
          <h1 id="auth-title">
            {isSignIn
              ? `Sign in to ${account?.householdName}`
              : 'Create a household account'}
          </h1>
          <p className="auth-copy">
            The planner, children, schedule, and family lists stay behind this
            parent gate on the current device.
          </p>
          <div className="auth-promises" aria-label="Privacy commitments">
            <span>Local account</span>
            <span>No ad pixels</span>
            <span>Parent-controlled</span>
          </div>
        </div>

        <form className="auth-form" onSubmit={isSignIn ? onSignIn : onCreate}>
          {isSignIn ? (
            <div className="auth-account-summary">
              <span>Household</span>
              <strong>{account?.householdName}</strong>
            </div>
          ) : (
            <label>
              <span>Household name</span>
              <input
                autoComplete="organization"
                value={form.householdName}
                onChange={(event) =>
                  onFormChange({ householdName: event.target.value })
                }
              />
            </label>
          )}

          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              type="email"
              value={form.email}
              onChange={(event) => onFormChange({ email: event.target.value })}
            />
          </label>

          <label>
            <span>Passcode</span>
            <input
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              type="password"
              value={form.passcode}
              onChange={(event) =>
                onFormChange({ passcode: event.target.value })
              }
            />
          </label>

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit">
            {isSignIn ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </section>
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
}

function SchedulePanel({
  activityById,
  activeBlock,
  nowMinutes,
  schedule,
}: SchedulePanelProps) {
  return (
    <section className="schedule-panel" id="schedule" aria-label="Today schedule">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Schedule</p>
          <h2>{formatTime(nowMinutes)}</h2>
        </div>
      </div>

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

function loadInitialAuth(storage: StorageLike | undefined): AuthState {
  const account = loadAccount(storage)

  return {
    account,
    session: loadSession(storage, account),
  }
}

function getBrowserStorage(): StorageLike | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
}

export default App
