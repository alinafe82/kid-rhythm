import { applyPlannerAction } from '../domain/planner'
import { describe, expect, it } from 'vitest'
import { APP_STATE_STORAGE_KEY, MAX_BACKUP_BYTES, parsePlannerBackup, createDefaultAppState, createEmptyAppState, loadPlannerState, saveAppState, type StorageLike } from './appState'

function storageWith(raw: string | null): StorageLike {
  const values = new Map<string, string>()
  if (raw !== null) values.set(APP_STATE_STORAGE_KEY, raw)
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) }, removeItem: (key) => { values.delete(key) } }
}

describe('parent local planner storage', () => {
  it('starts empty without silently adding sample children, feedback or schedule', () => {
    const storage = storageWith(null)
    const loaded = loadPlannerState(storage)
    expect(loaded.state).toEqual(createEmptyAppState())
    expect(loaded.canPersist).toBe(true)
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBeNull()
  })

  it('keeps all saved family lists and supports older records without organizer', () => {
    const saved = createDefaultAppState()
    saved.household.children[0].name = 'Existing parent initials'
    saved.schedule = []
    const raw = JSON.stringify(saved)
    const storage = storageWith(raw)
    expect(loadPlannerState(storage).state).toEqual(saved)
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(raw)
    const { organizer: _organizer, ...old } = saved
    const migrated = loadPlannerState(storageWith(JSON.stringify(old)))
    expect(migrated.canPersist).toBe(true)
    expect(migrated.state.household.children[0].name).toBe('Existing parent initials')
    expect(migrated.state.organizer).toEqual(createEmptyAppState().organizer)
    expect(migrated.state.schedule).toEqual([])
  })

  it.each(['{unreadable', 'null', JSON.stringify({ household: null, schedule: [] }), JSON.stringify({ household: {}, organizer: null, schedule: [] }), JSON.stringify({ household: {}, organizer: {} }), JSON.stringify({ household: {}, schedule: [{ startMinutes: -1 }] })])('preserves unreadable bytes and blocks automatic persistence: %s', (raw) => {
    const storage = storageWith(raw)
    const loaded = loadPlannerState(storage)
    expect(loaded.canPersist).toBe(false)
    expect(loaded.warning).toContain('left untouched')
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(raw)
  })

  it.each([
    ['household', 'feedback', [null]],
    ['household', 'recentlyCompleted', [null]],
    ['household', 'children', [null]],
    ['household', 'availableSupplies', [null]],
    ['household', 'blockedActivityIds', [{}]],
    ['organizer', 'groceryItems', [null]],
    ['organizer', 'todoItems', [null]],
    ['organizer', 'mealPlan', [null]],
    ['organizer', 'notes', [null]],
    ['organizer', 'notes', [{ title: ' ', body: 'Body' }]],
    ['organizer', 'notes', [{ title: 'Synthetic title', body: ' ' }]],
    ['organizer', 'mealPlan', [{ dayLabel: 'Monday', meal: ' ' }]],
    ['organizer', 'mealPlan', [{ dayLabel: ' ', meal: 'Synthetic soup' }]],
    ['organizer', 'groceryItems', [{ text: null }]],
    ['household', 'feedback', [{ activityId: 'reading-nest', rating: 'unknown', contextPeriod: 'midday', timestamp: '2026-10-19' }]],
  ])('does not expose malformed %s.%s entries to recommendations or overwrite their bytes', (section, field, entries) => {
    const saved = createDefaultAppState()
    const record = saved[section as 'household' | 'organizer'] as unknown as Record<string, unknown>
    record[field as string] = entries
    const raw = JSON.stringify(saved)
    const storage = storageWith(raw)
    const loaded = loadPlannerState(storage)
    expect(loaded.canPersist).toBe(false)
    expect(loaded.warning).toContain('left untouched')
    expect(loaded.state.household.children).toEqual([])
    expect(loaded.state.household.feedback).toEqual([])
    expect(loaded.state.household.recentlyCompleted).toEqual([])
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(raw)
  })

  it('reports denied reads and write quota failures without crashing or claiming a saved change', () => {
    const storage: StorageLike = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') }, removeItem: () => {} }
    expect(loadPlannerState(storage).canPersist).toBe(false)
    expect(saveAppState(storage, createEmptyAppState())).toBe(false)
    expect(loadPlannerState(undefined).warning).toContain('only while this page stays open')
  })

  it('gives id-less legacy rows stable distinct IDs, avoids stored ID collisions, and removes only one sibling', () => {
    const saved = createEmptyAppState()
    const legacy = {
      ...saved,
      organizer: {
        groceryItems: [{ text: 'Synthetic oats', completed: false }, { text: 'Synthetic fruit', completed: false }, { id: 'legacy-groceries-0', text: 'Stored collision', completed: false }],
        todoItems: [{ text: 'First synthetic task' }, { text: 'Second synthetic task' }],
        mealPlan: [{ dayLabel: 'Monday', meal: 'Synthetic soup' }, { dayLabel: 'Tuesday', meal: 'Synthetic rice' }],
        notes: [{ title: 'First synthetic note', body: 'First' }, { title: 'Second synthetic note', body: 'Second' }],
      },
    }
    const raw = JSON.stringify(legacy)
    const storage = storageWith(raw)
    const loaded = loadPlannerState(storage)
    expect(loaded.canPersist).toBe(true)
    expect(loaded.state).toEqual(loadPlannerState(storage).state)
    for (const rows of Object.values(loaded.state.organizer)) expect(new Set(rows.map((row: { id: string }) => row.id)).size).toBe(rows.length)
    expect(loaded.state.organizer.groceryItems[0].id).not.toBe('legacy-groceries-0')
    const next = applyPlannerAction(loaded.state, { type: 'remove-organizer-item', listName: 'groceryItems', itemId: loaded.state.organizer.groceryItems[0].id })
    expect(next.organizer.groceryItems.map((row) => row.text)).toEqual(['Synthetic fruit', 'Stored collision'])
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(raw)
  })

  it('keeps duplicate explicit IDs read-only without rewriting their stored bytes', () => {
    const saved = createEmptyAppState()
    saved.organizer.notes = [{ id: 'duplicate', title: 'First', body: 'First' }, { id: 'duplicate', title: 'Second', body: 'Second' }]
    const raw = JSON.stringify(saved)
    const storage = storageWith(raw)
    expect(loadPlannerState(storage).canPersist).toBe(false)
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(raw)
  })

  it('validates local backup size and schema before restoring any planner state', () => {
    expect(parsePlannerBackup(JSON.stringify(createEmptyAppState()))).toEqual(createEmptyAppState())
    expect(() => parsePlannerBackup(' '.repeat(MAX_BACKUP_BYTES + 1))).toThrow('1 MB')
    expect(() => parsePlannerBackup('')).toThrow()
    expect(() => parsePlannerBackup(JSON.stringify({ household: {}, schedule: [] , organizer: { notes: [null] } }))).toThrow('Unrecognized')
  })

  it('restores a parent-created empty routine without switching back to sample data', () => {
    const storage = storageWith(null)
    expect(saveAppState(storage, createEmptyAppState())).toBe(true)
    expect(loadPlannerState(storage).state).toEqual(createEmptyAppState())
  })

  it('persists explicitly selected sample data with its durable label', () => {
    const storage = storageWith(null)
    expect(saveAppState(storage, createDefaultAppState())).toBe(true)
    expect(loadPlannerState(storage).state.dataOrigin).toBe('sample')
  })
})
