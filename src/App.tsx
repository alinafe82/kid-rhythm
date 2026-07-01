import { useMemo, useState } from 'react'
import './App.css'
import {
  demoHousehold,
  demoNowMinutes,
  initialSchedule,
} from './data/demoHousehold'
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
  ActivityFeedback,
  ActivitySetting,
  EnergyLevel,
  FeedbackRating,
  RecentActivity,
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

function App() {
  const [nowMinutes, setNowMinutes] = useState(demoNowMinutes)
  const [desiredEnergy, setDesiredEnergy] = useState<EnergyLevel>('calm')
  const [supervision, setSupervision] = useState<SupervisionLevel>('nearby')
  const [setting, setSetting] = useState<ActivitySetting>('indoor')
  const [feedback, setFeedback] = useState<ActivityFeedback[]>(
    demoHousehold.feedback,
  )
  const [recentlyCompleted, setRecentlyCompleted] = useState<RecentActivity[]>(
    demoHousehold.recentlyCompleted,
  )
  const [schedule, setSchedule] = useState<ScheduleBlock[]>(initialSchedule)

  const activityById = useMemo(
    () => new Map(seedActivities.map((activity) => [activity.id, activity])),
    [],
  )

  const activeBlock =
    findCurrentBlock(schedule, nowMinutes) ??
    findNextFlexibleBlock(schedule, nowMinutes)
  const availableMinutes = getAvailableMinutes(activeBlock, nowMinutes)

  const household = useMemo(
    () => ({
      ...demoHousehold,
      feedback,
      recentlyCompleted,
    }),
    [feedback, recentlyCompleted],
  )

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

  const recordFeedback = (activity: Activity, rating: FeedbackRating) => {
    setFeedback((current) => [
      {
        activityId: activity.id,
        rating,
        contextPeriod: getTimePeriod(nowMinutes),
        timestamp: new Date().toISOString(),
      },
      ...current,
    ])

    if (rating === 'worked') {
      setRecentlyCompleted((current) => [
        {
          activityId: activity.id,
          category: activity.category,
          completedAtMinutesAgo: 0,
        },
        ...current,
      ])
    }
  }

  const scheduleActivity = (activity: Activity) => {
    if (!activeBlock) {
      return
    }

    setSchedule((current) =>
      assignActivityToBlock(current, activeBlock.id, activity.id),
    )
  }

  const startActivity = (activity: Activity) => {
    if (!activeBlock) {
      return
    }

    setSchedule((current) =>
      updateBlockStatus(
        assignActivityToBlock(current, activeBlock.id, activity.id),
        activeBlock.id,
        'active',
      ),
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Family Rhythm</p>
          <h1>Today</h1>
        </div>
        <div className="household-strip" aria-label="Household">
          {household.children.map((child) => (
            <span key={child.id}>
              {child.name}, {child.age}
            </span>
          ))}
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
              <p className="eyebrow">Recommended now</p>
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

        <aside className="schedule-panel" aria-label="Today schedule">
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
        </aside>
      </div>

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

export default App
