import { describe, expect, it } from 'vitest'
import { demoHousehold } from '../data/demoHousehold'
import { seedActivities } from '../data/seedActivities'
import { toMinutes } from './schedule'
import type { Activity, HouseholdProfile, RecommendationContext } from './types'
import { getTimePeriod, rankActivities, scoreActivity } from './recommendation'

const middayCalmContext: RecommendationContext = {
  nowMinutes: toMinutes('13:10'),
  availableMinutes: 50,
  desiredEnergy: 'calm',
  supervisionAvailability: 'nearby',
  setting: 'indoor',
}

function getActivity(activityId: string): Activity {
  const activity = seedActivities.find((item) => item.id === activityId)

  if (!activity) {
    throw new Error(`Missing test activity ${activityId}`)
  }

  return activity
}

describe('activity recommendations', () => {
  it('maps clock time to recommendation periods', () => {
    expect(getTimePeriod(toMinutes('10:59'))).toBe('morning')
    expect(getTimePeriod(toMinutes('11:00'))).toBe('midday')
    expect(getTimePeriod(toMinutes('14:00'))).toBe('afternoon')
    expect(getTimePeriod(toMinutes('17:00'))).toBe('evening')
  })

  it('ranks a household-proven quiet activity first after lunch', () => {
    const ranked = rankActivities(seedActivities, demoHousehold, middayCalmContext)

    expect(ranked[0]?.activity.id).toBe('reading-nest')
    expect(ranked[0]?.reasons).toContain(
      'This has worked for the household before.',
    )
    expect(ranked[0]?.reasons).toContain('Works well after lunch or quiet time.')
  })

  it('honors a custom recommendation limit', () => {
    const ranked = rankActivities(
      seedActivities,
      demoHousehold,
      middayCalmContext,
      2,
    )

    expect(ranked).toHaveLength(2)
  })

  it('filters activities that need missing supplies', () => {
    const ranked = rankActivities(seedActivities, demoHousehold, middayCalmContext)

    expect(ranked.some((item) => item.activity.id === 'rice-sensory-bin')).toBe(
      false,
    )
    expect(
      scoreActivity(getActivity('rice-sensory-bin'), demoHousehold, {
        ...middayCalmContext,
        supervisionAvailability: 'active',
      }),
    ).toBeNull()
  })

  it('respects the available supervision level', () => {
    const independentContext: RecommendationContext = {
      ...middayCalmContext,
      supervisionAvailability: 'independent',
    }

    const ranked = rankActivities(seedActivities, demoHousehold, independentContext)

    expect(ranked.every((item) => item.activity.supervision === 'independent')).toBe(
      true,
    )
  })

  it('filters blocked, age-mismatched, setting-mismatched, and too-long options', () => {
    const readingNest = getActivity('reading-nest')

    expect(
      scoreActivity(
        readingNest,
        {
          ...demoHousehold,
          blockedActivityIds: ['reading-nest'],
        },
        middayCalmContext,
      ),
    ).toBeNull()
    expect(
      scoreActivity(
        readingNest,
        {
          ...demoHousehold,
          children: [{ ...demoHousehold.children[0]!, age: 11 }],
        },
        middayCalmContext,
      ),
    ).toBeNull()
    expect(
      scoreActivity(readingNest, demoHousehold, {
        ...middayCalmContext,
        setting: 'outdoor',
      }),
    ).toBeNull()
    expect(
      scoreActivity(readingNest, demoHousehold, {
        ...middayCalmContext,
        availableMinutes: 5,
      }),
    ).toBeNull()
  })

  it('allows either setting from the context or activity', () => {
    const readingNest = getActivity('reading-nest')
    const eitherActivity: Activity = {
      ...readingNest,
      id: 'either-reading',
      setting: 'either',
    }

    expect(
      scoreActivity(readingNest, demoHousehold, {
        ...middayCalmContext,
        setting: 'either',
      })?.activity.id,
    ).toBe('reading-nest')
    expect(
      scoreActivity(eitherActivity, demoHousehold, {
        ...middayCalmContext,
        setting: 'outdoor',
      })?.activity.id,
    ).toBe('either-reading')
  })

  it('penalizes activities used inside their repeat cooldown', () => {
    const roadMap = getActivity('tape-road-map')
    const context: RecommendationContext = {
      nowMinutes: toMinutes('09:20'),
      availableMinutes: 45,
      desiredEnergy: 'moderate',
      supervisionAvailability: 'nearby',
      setting: 'indoor',
    }

    const withRecent = scoreActivity(roadMap, demoHousehold, context)
    const withoutRecent = scoreActivity(
      roadMap,
      {
        ...demoHousehold,
        recentlyCompleted: [],
      },
      context,
    )

    expect(withRecent?.score).toBeLessThan(withoutRecent?.score ?? 0)
    expect(withRecent?.cautions).toContain('Recently used; better as a backup.')
  })

  it('penalizes a repeated category without marking the exact activity recent', () => {
    const stickerStory = getActivity('sticker-story')
    const scored = scoreActivity(
      stickerStory,
      {
        ...demoHousehold,
        recentlyCompleted: [
          {
            activityId: 'other-creative',
            category: 'creative',
            completedAtMinutesAgo: 20,
          },
        ],
      },
      middayCalmContext,
    )

    expect(scored?.reasons).not.toContain('Adds variety to the recent queue.')
  })

  it('rewards activities that match child interests and energy patterns', () => {
    const stickerStory = getActivity('sticker-story')
    const household: HouseholdProfile = {
      ...demoHousehold,
      children: [
        {
          ...demoHousehold.children[0]!,
          signals: {
            ...demoHousehold.children[0]!.signals,
            preferredEnergy: 'calm',
            interests: ['creative'],
          },
        },
      ],
    }

    const scored = scoreActivity(stickerStory, household, middayCalmContext)

    expect(scored?.reasons).toContain("Matches Mara's usual energy pattern.")
    expect(scored?.reasons).toContain("Connects with Mara's interests.")
  })

  it('flags activities that exceed a child mess tolerance', () => {
    const sensoryBin = getActivity('rice-sensory-bin')
    const household: HouseholdProfile = {
      ...demoHousehold,
      children: [
        {
          ...demoHousehold.children[0]!,
          signals: {
            ...demoHousehold.children[0]!.signals,
            messTolerance: 'low',
          },
        },
      ],
      availableSupplies: ['dry rice', 'cups', 'tray'],
    }
    const context: RecommendationContext = {
      ...middayCalmContext,
      supervisionAvailability: 'active',
    }

    const scored = scoreActivity(sensoryBin, household, context)

    expect(scored?.cautions).toContain("Mara's mess tolerance may be stretched.")
  })

  it('scores sensitive transitions, independence, sensory seeking, and morning movement', () => {
    const obstacleLoop = getActivity('obstacle-loop')
    const household: HouseholdProfile = {
      ...demoHousehold,
      children: [
        {
          ...demoHousehold.children[0]!,
          signals: {
            preferredEnergy: 'active',
            transitionNeed: 'sensitive',
            independence: 'together',
            messTolerance: 'high',
            sensoryNeed: 'sensory-seeking',
            interests: ['movement'],
          },
        },
      ],
      availableSupplies: ['pillows', 'tape'],
      feedback: [],
      recentlyCompleted: [],
    }
    const scored = scoreActivity(obstacleLoop, household, {
      nowMinutes: toMinutes('09:20'),
      availableMinutes: 90,
      desiredEnergy: 'active',
      supervisionAvailability: 'active',
      setting: 'indoor',
      currentBlock: {
        id: 'movement-block',
        label: 'Movement block',
        type: 'guided',
        startMinutes: toMinutes('09:00'),
        endMinutes: toMinutes('10:30'),
        locked: false,
        status: 'planned',
        preferredCategory: 'movement',
        preferredEnergy: 'active',
      },
    })

    expect(scored?.reasons).toContain('Active fits the current energy target.')
    expect(scored?.reasons).toContain('Builds in parent connection for Mara.')
    expect(scored?.reasons).toContain('Gives Mara more sensory input.')
    expect(scored?.reasons).toContain('Morning is a strong fit for movement.')
    expect(scored?.reasons).toContain('Matches movement block.')
    expect(scored?.reasons).toContain('Matches the planned movement block.')
    expect(scored?.cautions).toContain('Adult should clear sharp corners and watch each round.')
  })

  it('scores low-stimulus quiet fit and transition cautions', () => {
    const roadMap = getActivity('tape-road-map')
    const scored = scoreActivity(
      roadMap,
      {
        ...demoHousehold,
        children: [
          {
            ...demoHousehold.children[0]!,
            signals: {
              ...demoHousehold.children[0]!.signals,
              transitionNeed: 'sensitive',
              sensoryNeed: 'low-stimulus',
              messTolerance: 'none',
            },
          },
        ],
        recentlyCompleted: [],
      },
      {
        ...middayCalmContext,
        desiredEnergy: 'active',
      },
    )

    expect(scored?.cautions).toContain('Mara may need transition support.')
    expect(scored?.score).toBeLessThan(80)
  })

  it('does not add transition support when only cleanup is high', () => {
    const cleanupOnlyActivity: Activity = {
      ...getActivity('reading-nest'),
      id: 'cleanup-only',
      cleanupBurden: 'high',
    }
    const scored = scoreActivity(
      cleanupOnlyActivity,
      {
        ...demoHousehold,
        recentlyCompleted: [],
      },
      middayCalmContext,
    )

    expect(scored?.cautions).not.toContain('Mara may need transition support.')
    expect(scored?.cautions).toContain('Expect cleanup time.')
  })

  it('penalizes opposite energy targets', () => {
    const readingNest = getActivity('reading-nest')
    const calmScore = scoreActivity(readingNest, demoHousehold, middayCalmContext)
    const activeTargetScore = scoreActivity(readingNest, demoHousehold, {
      ...middayCalmContext,
      desiredEnergy: 'active',
    })
    const moderateTargetScore = scoreActivity(readingNest, demoHousehold, {
      ...middayCalmContext,
      desiredEnergy: 'moderate',
    })

    expect(activeTargetScore?.score).toBeLessThan(calmScore?.score ?? 0)
    expect(moderateTargetScore?.score).toBeGreaterThan(
      activeTargetScore?.score ?? 0,
    )
    expect(activeTargetScore?.reasons).not.toContain(
      'Calm fits the current energy target.',
    )
  })

  it('scores sensory-seeking matches by movement or sensory category', () => {
    const calmMovementActivity: Activity = {
      ...getActivity('reading-nest'),
      id: 'calm-movement',
      category: 'movement',
      energy: 'calm',
    }
    const calmSensoryActivity: Activity = {
      ...getActivity('reading-nest'),
      id: 'calm-sensory',
      category: 'sensory',
      energy: 'calm',
    }
    const household: HouseholdProfile = {
      ...demoHousehold,
      children: [
        {
          ...demoHousehold.children[0]!,
          signals: {
            ...demoHousehold.children[0]!.signals,
            sensoryNeed: 'sensory-seeking',
          },
        },
      ],
      recentlyCompleted: [],
    }

    expect(
      scoreActivity(calmMovementActivity, household, middayCalmContext)?.reasons,
    ).toContain('Gives Mara more sensory input.')
    expect(
      scoreActivity(calmSensoryActivity, household, middayCalmContext)?.reasons,
    ).toContain('Gives Mara more sensory input.')
  })

  it('does not add schedule preference reasons when preferences do not match', () => {
    const readingNest = getActivity('reading-nest')
    const scored = scoreActivity(readingNest, demoHousehold, {
      ...middayCalmContext,
      currentBlock: {
        id: 'active-block',
        label: 'Active block',
        type: 'guided',
        startMinutes: toMinutes('13:00'),
        endMinutes: toMinutes('14:00'),
        locked: false,
        status: 'planned',
        preferredCategory: 'movement',
        preferredEnergy: 'active',
      },
    })

    expect(scored?.reasons).not.toContain('Matches active block.')
    expect(scored?.reasons).not.toContain('Matches the planned movement block.')
  })

  it('scores parent-light chores, afternoon chores, and no current block', () => {
    const laundrySort = getActivity('laundry-color-sort')
    const scored = scoreActivity(
      laundrySort,
      {
        ...demoHousehold,
        feedback: [],
        recentlyCompleted: [],
      },
      {
        nowMinutes: toMinutes('15:10'),
        availableMinutes: 25,
        desiredEnergy: 'active',
        supervisionAvailability: 'nearby',
        setting: 'indoor',
      },
    )

    expect(scored?.reasons).toContain('Can run with light parent involvement.')
    expect(scored?.reasons).toContain('Low setup.')
    expect(scored?.reasons).toContain('Good fit for the afternoon reset.')
    expect(scored?.reasons).toContain('Adds variety to the recent queue.')
  })

  it('adds feedback cautions for messy and supervision-heavy activities', () => {
    const snackMath = getActivity('snack-math')
    const scored = scoreActivity(
      snackMath,
      {
        ...demoHousehold,
        feedback: [
          {
            activityId: 'snack-math',
            rating: 'too-messy',
            contextPeriod: 'morning',
            timestamp: '2026-07-01T09:00:00.000Z',
          },
          {
            activityId: 'snack-math',
            rating: 'too-much-supervision',
            contextPeriod: 'midday',
            timestamp: '2026-07-01T12:00:00.000Z',
          },
          {
            activityId: 'snack-math',
            rating: 'too-hard',
            contextPeriod: 'midday',
            timestamp: '2026-07-01T12:05:00.000Z',
          },
          {
            activityId: 'snack-math',
            rating: 'disliked',
            contextPeriod: 'midday',
            timestamp: '2026-07-01T12:10:00.000Z',
          },
          {
            activityId: 'snack-math',
            rating: 'try-later',
            contextPeriod: 'midday',
            timestamp: '2026-07-01T12:15:00.000Z',
          },
          {
            activityId: 'other',
            rating: 'worked',
            contextPeriod: 'midday',
            timestamp: '2026-07-01T12:20:00.000Z',
          },
        ],
        recentlyCompleted: [],
      },
      {
        ...middayCalmContext,
        supervisionAvailability: 'active',
      },
    )

    expect(scored?.cautions).toContain('Past feedback marked this as messy.')
    expect(scored?.cautions).toContain('Past feedback needed more adult help.')
    expect(scored?.cautions).toContain('Adult handles knives, heat, and choking-risk foods.')
  })
})
