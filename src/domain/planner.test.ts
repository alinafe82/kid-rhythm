import { describe, expect, it } from 'vitest'
import { createDefaultAppState } from '../data/appState'
import { seedActivities } from '../data/seedActivities'
import { applyPlannerAction } from './planner'

describe('planner state transitions', () => {
  it('starts an activity and records successful feedback through one interface', () => {
    const initial = createDefaultAppState()
    const blockId = initial.schedule[0].id
    const activity = seedActivities[0]

    const started = applyPlannerAction(initial, {
      type: 'start-activity',
      blockId,
      activityId: activity.id,
    })
    const completed = applyPlannerAction(started, {
      type: 'record-feedback',
      activity,
      rating: 'worked',
      nowMinutes: 13 * 60,
      timestamp: '2026-08-04T18:40:00.000Z',
    })

    expect(started.schedule[0]).toMatchObject({
      assignedActivityId: activity.id,
      status: 'active',
    })
    expect(completed.household.feedback[0]).toEqual({
      activityId: activity.id,
      rating: 'worked',
      contextPeriod: 'midday',
      timestamp: '2026-08-04T18:40:00.000Z',
    })
    expect(completed.household.recentlyCompleted[0]).toMatchObject({
      activityId: activity.id,
      category: activity.category,
    })
  })

  it('applies household changes without exposing state-shape knowledge', () => {
    const initial = createDefaultAppState()
    const firstChild = initial.household.children[0]
    const addedChild = {
      id: 'child-new',
      name: 'New child',
      age: 6,
      signals: firstChild.signals,
    }

    let state = applyPlannerAction(initial, {
      type: 'update-child',
      childId: firstChild.id,
      patch: { name: 'Updated' },
    })
    state = applyPlannerAction(state, { type: 'add-child', child: addedChild })
    state = applyPlannerAction(state, {
      type: 'update-child-signals',
      childId: addedChild.id,
      patch: { preferredEnergy: 'calm' },
    })
    state = applyPlannerAction(state, {
      type: 'toggle-child-interest',
      childId: addedChild.id,
      category: 'outdoor',
    })
    state = applyPlannerAction(state, {
      type: 'toggle-supply',
      supply: 'masking tape',
    })
    state = applyPlannerAction(state, {
      type: 'toggle-blocked-activity',
      activityId: seedActivities[0].id,
    })
    state = applyPlannerAction(state, {
      type: 'remove-child',
      childId: firstChild.id,
    })

    expect(state.household.children.some((child) => child.name === 'Updated')).toBe(false)
    expect(state.household.children.find((child) => child.id === addedChild.id)).toMatchObject({
      signals: { preferredEnergy: 'calm', interests: expect.arrayContaining(['outdoor']) },
    })
    expect(state.household.availableSupplies).toContain('masking tape')
    expect(state.household.blockedActivityIds).toContain(seedActivities[0].id)
  })

  it('applies organizer changes through the planner interface', () => {
    let state = createDefaultAppState()

    state = applyPlannerAction(state, {
      type: 'add-organizer-item',
      listName: 'groceryItems',
      id: 'grocery-new',
      text: '  Oats  ',
    })
    state = applyPlannerAction(state, {
      type: 'toggle-organizer-item',
      listName: 'groceryItems',
      itemId: 'grocery-new',
    })
    state = applyPlannerAction(state, {
      type: 'add-meal',
      entry: { id: 'meal-new', dayLabel: 'Friday', meal: 'Soup' },
    })
    state = applyPlannerAction(state, {
      type: 'add-note',
      note: { id: 'note-new', title: 'Pickup', body: 'Leave at 3' },
    })

    expect(state.organizer.groceryItems.at(-1)).toEqual({
      id: 'grocery-new',
      text: 'Oats',
      completed: true,
    })
    expect(state.organizer.mealPlan.at(-1)?.meal).toBe('Soup')
    expect(state.organizer.notes.at(-1)?.title).toBe('Pickup')

    state = applyPlannerAction(state, {
      type: 'remove-organizer-item',
      listName: 'groceryItems',
      itemId: 'grocery-new',
    })
    state = applyPlannerAction(state, { type: 'remove-meal', entryId: 'meal-new' })
    state = applyPlannerAction(state, { type: 'remove-note', noteId: 'note-new' })

    expect(state.organizer.groceryItems.some((item) => item.id === 'grocery-new')).toBe(false)
    expect(state.organizer.mealPlan.some((entry) => entry.id === 'meal-new')).toBe(false)
    expect(state.organizer.notes.some((note) => note.id === 'note-new')).toBe(false)
  })

  it('schedules an activity without starting the block', () => {
    const initial = createDefaultAppState()
    const blockId = initial.schedule[0].id
    const scheduled = applyPlannerAction(initial, {
      type: 'schedule-activity',
      blockId,
      activityId: seedActivities[0].id,
    })

    expect(scheduled.schedule[0]).toMatchObject({
      assignedActivityId: seedActivities[0].id,
      status: 'planned',
    })
  })

  it('removes toggled values and keeps non-success feedback out of recents', () => {
    const initial = createDefaultAppState()
    const child = initial.household.children[0]
    const existingInterest = child.signals.interests[0]
    const existingSupply = initial.household.availableSupplies[0]
    const activity = seedActivities[0]
    const withBlocked = {
      ...initial,
      household: {
        ...initial.household,
        blockedActivityIds: [activity.id],
      },
    }

    let state = applyPlannerAction(withBlocked, {
      type: 'toggle-child-interest',
      childId: child.id,
      category: existingInterest,
    })
    state = applyPlannerAction(state, {
      type: 'toggle-supply',
      supply: existingSupply,
    })
    state = applyPlannerAction(state, {
      type: 'toggle-blocked-activity',
      activityId: activity.id,
    })
    state = applyPlannerAction(state, {
      type: 'record-feedback',
      activity,
      rating: 'try-later',
      nowMinutes: 9 * 60,
      timestamp: '2026-08-04T18:50:00.000Z',
    })

    expect(state.household.children[0].signals.interests).not.toContain(existingInterest)
    expect(state.household.availableSupplies).not.toContain(existingSupply)
    expect(state.household.blockedActivityIds).not.toContain(activity.id)
    expect(state.household.recentlyCompleted).toEqual(initial.household.recentlyCompleted)
  })

  it('rejects empty organizer content and preserves the last child', () => {
    const initial = createDefaultAppState()
    const oneChild = {
      ...initial,
      household: { ...initial.household, children: [initial.household.children[0]] },
    }

    expect(
      applyPlannerAction(oneChild, {
        type: 'remove-child',
        childId: oneChild.household.children[0].id,
      }),
    ).toBe(oneChild)
    expect(
      applyPlannerAction(initial, {
        type: 'add-organizer-item',
        listName: 'todoItems',
        id: 'empty',
        text: '   ',
      }),
    ).toBe(initial)
    expect(
      applyPlannerAction(initial, {
        type: 'add-meal',
        entry: { id: 'empty-day', dayLabel: ' ', meal: 'Soup' },
      }),
    ).toBe(initial)
    expect(
      applyPlannerAction(initial, {
        type: 'add-meal',
        entry: { id: 'empty-meal', dayLabel: 'Friday', meal: ' ' },
      }),
    ).toBe(initial)
    expect(
      applyPlannerAction(initial, {
        type: 'add-note',
        note: { id: 'empty-title', title: ' ', body: 'Body' },
      }),
    ).toBe(initial)
    expect(
      applyPlannerAction(initial, {
        type: 'add-note',
        note: { id: 'empty-body', title: 'Title', body: ' ' },
      }),
    ).toBe(initial)
  })

  it('normalizes optional organizer text inside the planner module', () => {
    const initial = createDefaultAppState()
    const withMeal = applyPlannerAction(initial, {
      type: 'add-meal',
      entry: {
        id: 'meal-trimmed',
        dayLabel: ' Friday ',
        meal: ' Soup ',
        notes: '  with bread  ',
      },
    })
    const withNote = applyPlannerAction(withMeal, {
      type: 'add-note',
      note: { id: 'note-trimmed', title: ' Pickup ', body: ' At three ' },
    })

    expect(withNote.organizer.mealPlan.at(-1)).toMatchObject({
      dayLabel: 'Friday',
      meal: 'Soup',
      notes: 'with bread',
    })
    expect(withNote.organizer.notes.at(-1)).toMatchObject({
      title: 'Pickup',
      body: 'At three',
    })
  })
})
