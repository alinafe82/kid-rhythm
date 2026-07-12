import { describe, expect, it } from 'vitest'
import {
  APP_STATE_STORAGE_KEY,
  clearAppState,
  createDefaultChildSignals,
  createDefaultAppState,
  loadAppState,
  saveAppState,
  type StorageLike,
} from './appState'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

describe('app state persistence', () => {
  it('loads a default household and schedule without storage', () => {
    const state = loadAppState(undefined)

    expect(state.household.children).toHaveLength(2)
    expect(state.schedule.length).toBeGreaterThan(0)
    expect(state.organizer.groceryItems.length).toBeGreaterThan(0)
  })

  it('loads defaults from empty storage and ignores saves without storage', () => {
    const storage = new MemoryStorage()

    expect(loadAppState(storage).household.children[0]?.name).toBe('Mara')
    expect(() => saveAppState(undefined, createDefaultAppState())).not.toThrow()
    expect(() => clearAppState(undefined)).not.toThrow()
  })

  it('saves and restores editable household and organizer state', () => {
    const storage = new MemoryStorage()
    const state = createDefaultAppState()
    state.household.children[0] = {
      id: 'ava',
      name: 'Ava',
      age: 6,
      signals: {
        ...createDefaultChildSignals(),
        preferredEnergy: 'active',
      },
    }
    state.household.availableSupplies = ['books']
    state.organizer.groceryItems = [
      {
        id: 'milk',
        text: 'Milk',
        completed: false,
      },
    ]
    state.organizer.mealPlan = [
      {
        id: 'monday-dinner',
        dayLabel: 'Monday',
        meal: 'Soup',
      },
    ]

    saveAppState(storage, state)

    expect(loadAppState(storage).household.children[0]?.name).toBe('Ava')
    expect(loadAppState(storage).household.availableSupplies).toEqual(['books'])
    expect(loadAppState(storage).organizer.groceryItems[0]?.text).toBe('Milk')
    expect(loadAppState(storage).organizer.mealPlan[0]?.meal).toBe('Soup')
  })

  it('adds default whole-child signals to older child records', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        household: {
          children: [{ id: 'old', name: 'Old record', age: 5 }],
          availableSupplies: [],
          blockedActivityIds: [],
          feedback: [],
          recentlyCompleted: [],
        },
        schedule: createDefaultAppState().schedule,
      }),
    )

    expect(loadAppState(storage).household.children[0]?.signals).toEqual(
      createDefaultChildSignals(),
    )
    expect(loadAppState(storage).organizer.todoItems.length).toBeGreaterThan(0)
  })

  it('filters stored interests to known activity categories', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        household: {
          children: [
            {
              id: 'stored',
              name: 'Stored child',
              age: 7,
              signals: {
                ...createDefaultChildSignals(),
                interests: ['creative', 'unknown', 'movement', 'creative'],
              },
            },
          ],
          availableSupplies: [],
          blockedActivityIds: [],
          feedback: [],
          recentlyCompleted: [],
        },
        schedule: createDefaultAppState().schedule,
      }),
    )

    expect(loadAppState(storage).household.children[0]?.signals.interests).toEqual(
      ['creative', 'movement'],
    )
  })

  it('falls back for missing household fields and invalid child fields', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        household: {
          children: [
            null,
            {
              id: 42,
              name: false,
              age: 'six',
              signals: {
                preferredEnergy: 'loud',
                transitionNeed: 'instant',
                independence: 'remote',
                messTolerance: 'extreme',
                sensoryNeed: 'unknown',
              },
            },
          ],
          availableSupplies: 'books',
          blockedActivityIds: 'none',
          feedback: 'none',
          recentlyCompleted: 'none',
        },
        organizer: {},
        schedule: [],
      }),
    )

    const state = loadAppState(storage)

    expect(state.household.children[0]).toMatchObject({
      name: 'Child',
      age: 6,
      signals: createDefaultChildSignals(),
    })
    expect(state.household.children[1]).toMatchObject({
      name: 'Child',
      age: 6,
      signals: createDefaultChildSignals(),
    })
    expect(state.household.availableSupplies).toContain('books')
    expect(state.household.blockedActivityIds).toEqual([])
    expect(state.household.feedback.length).toBeGreaterThan(0)
    expect(state.household.recentlyCompleted.length).toBeGreaterThan(0)
    expect(state.schedule.length).toBeGreaterThan(0)
    expect(state.organizer.groceryItems.length).toBeGreaterThan(0)
  })

  it('falls back when household children and organizer text fields have invalid shapes', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        household: {
          children: 'not-children',
          availableSupplies: [],
          blockedActivityIds: [],
          feedback: [],
          recentlyCompleted: [],
        },
        organizer: {
          groceryItems: [],
          todoItems: [],
          mealPlan: [
            { id: 'bad-day', dayLabel: 10, meal: 'Soup' },
            { id: 'bad-meal', dayLabel: 'Tuesday', meal: false },
          ],
          notes: [
            { id: 'bad-title', title: 10, body: 'Body' },
            { id: 'bad-body', title: 'Title', body: false },
          ],
        },
        schedule: createDefaultAppState().schedule,
      }),
    )

    const state = loadAppState(storage)

    expect(state.household.children[0]?.name).toBe('Mara')
    expect(state.organizer.mealPlan).toEqual([])
    expect(state.organizer.notes).toEqual([])
  })

  it('falls back to the default household when the stored household is invalid', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        household: null,
        organizer: null,
        schedule: createDefaultAppState().schedule,
      }),
    )

    const state = loadAppState(storage)

    expect(state.household.children[0]?.name).toBe('Mara')
    expect(state.organizer.notes[0]?.title).toBe('Caregiver handoff')
  })

  it('falls back to defaults when stored data is malformed', () => {
    const storage = new MemoryStorage()
    storage.setItem(APP_STATE_STORAGE_KEY, 'not-json')

    expect(loadAppState(storage).household.children[0]?.name).toBe('Mara')
  })

  it('filters malformed family organizer rows from storage', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        household: createDefaultAppState().household,
        organizer: {
          groceryItems: [
            null,
            { id: 'eggs', text: ' Eggs ', completed: true },
            { id: 'blank', text: ' ', completed: false },
            { text: 'No id', completed: 'no' },
            { id: 'wrong', completed: false },
          ],
          todoItems: [{ id: 'shoes', text: 'Find shoes' }],
          mealPlan: [
            null,
            { id: 'dinner', dayLabel: 'Tonight', meal: 'Rice bowls' },
            { dayLabel: 'Friday', meal: 'Pizza', notes: ' Fast ' },
            { dayLabel: 'Saturday', meal: 'Pancakes', notes: ' ' },
            { id: 'missing-meal', dayLabel: 'Tomorrow' },
          ],
          notes: [
            null,
            { id: 'note', title: 'Bedtime', body: 'Start early.' },
            { title: 'No id', body: 'Trimmed body' },
            { id: 'empty-note', title: 'Empty', body: '' },
          ],
        },
        schedule: createDefaultAppState().schedule,
      }),
    )

    const organizer = loadAppState(storage).organizer

    expect(organizer.groceryItems).toEqual([
      { id: 'eggs', text: 'Eggs', completed: true },
      expect.objectContaining({
        text: 'No id',
        completed: false,
      }),
    ])
    expect(organizer.todoItems[0]).toEqual({
      id: 'shoes',
      text: 'Find shoes',
      completed: false,
    })
    expect(organizer.mealPlan).toEqual([
      { id: 'dinner', dayLabel: 'Tonight', meal: 'Rice bowls' },
      expect.objectContaining({
        dayLabel: 'Friday',
        meal: 'Pizza',
        notes: 'Fast',
      }),
      expect.objectContaining({
        dayLabel: 'Saturday',
        meal: 'Pancakes',
        notes: undefined,
      }),
    ])
    expect(organizer.notes).toEqual([
      { id: 'note', title: 'Bedtime', body: 'Start early.' },
      expect.objectContaining({
        title: 'No id',
        body: 'Trimmed body',
      }),
    ])
  })

  it('clears persisted state', () => {
    const storage = new MemoryStorage()
    saveAppState(storage, createDefaultAppState())
    clearAppState(storage)

    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBeNull()
  })
})
