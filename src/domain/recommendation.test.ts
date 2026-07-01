import { describe, expect, it } from 'vitest'
import { demoHousehold } from '../data/demoHousehold'
import { seedActivities } from '../data/seedActivities'
import { toMinutes } from './schedule'
import type { HouseholdProfile, RecommendationContext } from './types'
import { rankActivities, scoreActivity } from './recommendation'

const middayCalmContext: RecommendationContext = {
  nowMinutes: toMinutes('13:10'),
  availableMinutes: 50,
  desiredEnergy: 'calm',
  supervisionAvailability: 'nearby',
  setting: 'indoor',
}

describe('activity recommendations', () => {
  it('ranks a household-proven quiet activity first after lunch', () => {
    const ranked = rankActivities(seedActivities, demoHousehold, middayCalmContext)

    expect(ranked[0]?.activity.id).toBe('reading-nest')
    expect(ranked[0]?.reasons).toContain(
      'This has worked for the household before.',
    )
    expect(ranked[0]?.reasons).toContain('Works well after lunch or quiet time.')
  })

  it('filters activities that need missing supplies', () => {
    const ranked = rankActivities(seedActivities, demoHousehold, middayCalmContext)

    expect(ranked.some((item) => item.activity.id === 'rice-sensory-bin')).toBe(
      false,
    )
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

  it('penalizes activities used inside their repeat cooldown', () => {
    const roadMap = seedActivities.find(
      (activity) => activity.id === 'tape-road-map',
    )
    const context: RecommendationContext = {
      nowMinutes: toMinutes('09:20'),
      availableMinutes: 45,
      desiredEnergy: 'moderate',
      supervisionAvailability: 'nearby',
      setting: 'indoor',
    }

    expect(roadMap).toBeDefined()

    const withRecent = scoreActivity(roadMap!, demoHousehold, context)
    const withoutRecent = scoreActivity(
      roadMap!,
      {
        ...demoHousehold,
        recentlyCompleted: [],
      },
      context,
    )

    expect(withRecent?.score).toBeLessThan(withoutRecent?.score ?? 0)
    expect(withRecent?.cautions).toContain('Recently used; better as a backup.')
  })

  it('rewards activities that match child interests and energy patterns', () => {
    const stickerStory = seedActivities.find(
      (activity) => activity.id === 'sticker-story',
    )
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

    expect(stickerStory).toBeDefined()

    const scored = scoreActivity(stickerStory!, household, middayCalmContext)

    expect(scored?.reasons).toContain("Matches Mara's usual energy pattern.")
    expect(scored?.reasons).toContain("Connects with Mara's interests.")
  })

  it('flags activities that exceed a child mess tolerance', () => {
    const sensoryBin = seedActivities.find(
      (activity) => activity.id === 'rice-sensory-bin',
    )
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

    expect(sensoryBin).toBeDefined()

    const scored = scoreActivity(sensoryBin!, household, context)

    expect(scored?.cautions).toContain("Mara's mess tolerance may be stretched.")
  })
})
