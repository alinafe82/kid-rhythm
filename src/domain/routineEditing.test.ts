import { describe, expect, it } from 'vitest'
import { applyPlannerAction } from './planner'
import { createDefaultChildSignals, createEmptyAppState } from '../data/appState'
import { rankActivities } from './recommendation'
import { seedActivities } from '../data/seedActivities'
import { demoHousehold } from '../data/demoHousehold'
import { assignActivityToBlock, editSchedule, getAvailableMinutes } from './schedule'
import type { ScheduleBlock } from './types'
const block: ScheduleBlock = { id: 'breakfast', label: 'Breakfast', startMinutes: 480, endMinutes: 510, type: 'open', locked: false, status: 'planned' }

describe('parent routine editing', () => {
  it('adds chronological blocks, edits one without changing siblings, and retains activity assignment', () => {
    const later = { ...block, id: 'reading', label: 'Reading', startMinutes: 600, endMinutes: 630, assignedActivityId: 'reading-nest' }
    const added = editSchedule([later], block)
    expect(added.map((item) => item.id)).toEqual(['breakfast', 'reading'])
    const updated = editSchedule(added, { ...later, label: ' Quiet reading ', endMinutes: 640 })
    expect(updated[0]).toEqual(block)
    expect(updated[1].label).toBe('Quiet reading')
    expect(updated[1].assignedActivityId).toBe('reading-nest')
    expect(later.label).toBe('Reading')
  })

  it('rejects overlap and reversed or out-of-day times without losing existing blocks', () => {
    const existing = [block]
    expect(() => editSchedule(existing, { ...block, label: ' ' })).toThrow('label')
    expect(() => editSchedule(existing, { ...block, id: '' })).toThrow('label')
    expect(() => editSchedule(existing, { ...block, id: 'other', startMinutes: 500, endMinutes: 520 })).toThrow('overlaps')
    expect(() => editSchedule(existing, { ...block, startMinutes: 510, endMinutes: 480 })).toThrow('end time')
    expect(() => editSchedule(existing, { ...block, endMinutes: 1440 })).toThrow('same day')
    expect(existing).toEqual([block])
  })

  it('does not offer a ten-minute activity when an edited block has one minute left', () => {
    const availableMinutes = getAvailableMinutes({ ...block, startMinutes: 600, endMinutes: 601 }, 600)
    expect(availableMinutes).toBe(1)
    const activity = { ...seedActivities[0], ageRange: { min: 1, max: 12 }, supplies: [], duration: { min: 10, max: 15 } }
    expect(rankActivities([activity], demoHousehold, { nowMinutes: 600, availableMinutes, desiredEnergy: 'calm', supervisionAvailability: 'active', setting: 'indoor' })).toEqual([])
  })

  it('removes the only child and restores it once without duplicate IDs on repeated Undo', () => {
    const child = { id: 'only', name: 'Synthetic initials', age: 6, signals: createDefaultChildSignals() }
    const original = { ...createEmptyAppState(), household: { ...createEmptyAppState().household, children: [child] } }
    const removed = applyPlannerAction(original, { type: 'remove-child', childId: child.id })
    expect(removed.household.children).toEqual([])
    const restored = applyPlannerAction(removed, { type: 'add-child', child })
    const repeated = applyPlannerAction(restored, { type: 'add-child', child })
    expect(repeated.household.children).toEqual([child])
    expect(original.household.children).toEqual([child])
  })

  it('allows adjacent routines but never assigns a suggested activity over a fixed commitment', () => {
    expect(editSchedule([block], { ...block, id: 'adjacent', startMinutes: 510, endMinutes: 540 })).toHaveLength(2)
    const fixed = { ...block, type: 'fixed' as const, locked: true }
    expect(assignActivityToBlock([fixed], fixed.id, 'obstacle-loop')).toEqual([fixed])
    const state = { ...createEmptyAppState(), schedule: [fixed] }
    expect(applyPlannerAction(state, { type: 'start-activity', blockId: fixed.id, activityId: 'obstacle-loop' })).toEqual(state)
    expect(applyPlannerAction(state, { type: 'schedule-activity', blockId: fixed.id, activityId: 'obstacle-loop' })).toEqual(state)
    expect(assignActivityToBlock([block], block.id, 'obstacle-loop')[0].assignedActivityId).toBe('obstacle-loop')
  })
})
