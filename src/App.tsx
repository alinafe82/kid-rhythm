import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  clearAppState,
  createDefaultAppState,
  loadAppState,
  saveAppState,
  type AppState,
  type StorageLike,
} from './data/appState'
import { demoNowMinutes } from './data/demoHousehold'
import { seedActivities } from './data/seedActivities'
import {
  assignActivityToBlock,
  findCurrentBlock,
  findNextFlexibleBlock,
  formatTime,
  getAvailableMinutes,
  toMinutes,
  updateBlockStatus,
} from './domain/schedule'
import { getTimePeriod, rankActivities } from './domain/recommendation'
import type {
  Activity,
  ActivitySetting,
  ChildProfile,
  EnergyLevel,
  FeedbackRating,
  HouseholdProfile,
  ScheduleBlock,
  SupervisionLevel,
} from './domain/types'

const timeOptions = [
  { label: '9:20 AM', value: toMinutes('09:20') },
  { label: '1:10 PM', value: demoNowMinutes },
  { label: '3:05 PM', value: toMinutes('15:05') },
]

const energyOptions: EnergyLevel[] = ['calm', 'moderate', 'active']
const supervisionOptions: SupervisionLevel[] = ['independent', 'nearby', 'active']
const settingOptions: ActivitySetting[] = ['indoor', 'outdoor', 'either']

const allSupplies = Array.from(
  new Set(seedActivities.flatMap((activity) => activity.supplies)),
).sort()

function App() {
  const [appState, setAppState] = useState<AppState>(() =>
    loadAppState(getBrowserStorage()),
  )
  const [nowMinutes, setNowMinutes] = useState(demoNowMinutes)
  const [desiredEnergy, setDesiredEnergy] = useState<EnergyLevel>('calm')
  const [supervision, setSupervision] = useState<SupervisionLevel>('nearby')
  const [setting, setSetting] = useState<ActivitySetting>('indoor')
  const [selectedActivityId, setSelectedActivityId] = useState(seedActivities[0].id)

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
  const selectedActivity =
    activityById.get(selectedActivityId) ?? primary?.activity ?? seedActivities[0]
  const selectedActivityBlocked = household.blockedActivityIds.includes(
    selectedActivity.id,
  )

  const recordFeedback = (activity: Activity, rating: FeedbackRating) => {
    setAppState((current) => ({
      ...current,
      household: {
        ...current.household,
        feedback: [
          {
            activityId: activity.id,
            rating,
            contextPeriod: getTimePeriod(nowMinutes),
            timestamp: new Date().toISOString(),
          },
          ...current.household.feedback,
        ],
        recentlyCompleted:
          rating === 'worked'
            ? [
                {
                  activityId: activity.id,
                  category: activity.category,
                  completedAtMinutesAgo: 0,
                },
                ...current.household.recentlyCompleted,
              ]
            : current.household.recentlyCompleted,
      },
    }))
  }

  const scheduleActivity = (activity: Activity) => {
    if (!activeBlock) {
      return
    }

    setSelectedActivityId(activity.id)
    setAppState((current) => ({
      ...current,
      schedule: assignActivityToBlock(
        current.schedule,
        activeBlock.id,
        activity.id,
      ),
    }))
  }

  const startActivity = (activity: Activity) => {
    if (!activeBlock) {
      return
    }

    setSelectedActivityId(activity.id)
    setAppState((current) => ({
      ...current,
      schedule: updateBlockStatus(
        assignActivityToBlock(current.schedule, activeBlock.id, activity.id),
        activeBlock.id,
        'active',
      ),
    }))
  }

  const updateHousehold = (
    update: (household: HouseholdProfile) => HouseholdProfile,
  ) => {
    setAppState((current) => ({
      ...current,
      household: update(current.household),
    }))
  }

  const updateChild = (childId: string, patch: Partial<ChildProfile>) => {
    updateHousehold((current) => ({
      ...current,
      children: current.children.map((child) =>
        child.id === childId ? { ...child, ...patch } : child,
      ),
    }))
  }

  const addChild = () => {
    updateHousehold((current) => ({
      ...current,
      children: [
        ...current.children,
        {
          id: `child-${Date.now()}`,
          name: 'New child',
          age: 6,
        },
      ],
    }))
  }

  const removeChild = (childId: string) => {
    updateHousehold((current) =>
      current.children.length === 1
        ? current
        : {
            ...current,
            children: current.children.filter((child) => child.id !== childId),
          },
    )
  }

  const toggleSupply = (supply: string) => {
    updateHousehold((current) => {
      const hasSupply = current.availableSupplies.includes(supply)

      return {
        ...current,
        availableSupplies: hasSupply
          ? current.availableSupplies.filter((item) => item !== supply)
          : [...current.availableSupplies, supply].sort(),
      }
    })
  }

  const toggleBlockedActivity = (activityId: string) => {
    updateHousehold((current) => {
      const isBlocked = current.blockedActivityIds.includes(activityId)

      return {
        ...current,
        blockedActivityIds: isBlocked
          ? current.blockedActivityIds.filter((id) => id !== activityId)
          : [...current.blockedActivityIds, activityId],
      }
    })
  }

  const resetLocalData = () => {
    clearAppState(getBrowserStorage())
    setAppState(createDefaultAppState())
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">KidRhythm</p>
          <h1>Whole-child routines</h1>
        </div>
        <div className="household-strip" aria-label="Household">
          {household.children.map((child) => (
            <span key={child.id}>
              {child.name}, {child.age}
            </span>
          ))}
          <span>Saved locally</span>
        </div>
      </header>

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

      <section className="settings-band" aria-label="Household setup">
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
              <div key={child.id} className="child-row">
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

      <section className="alternate-band" aria-label="Alternate activities">
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
    <section className="schedule-panel" aria-label="Today schedule">
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

function getBrowserStorage(): StorageLike | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
}

export default App
