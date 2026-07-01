import { describe, expect, it } from 'vitest'
import {
  APP_STATE_STORAGE_KEY,
  clearAppState,
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
  })

  it('saves and restores editable household state', () => {
    const storage = new MemoryStorage()
    const state = createDefaultAppState()
    state.household.children[0] = {
      id: 'ava',
      name: 'Ava',
      age: 6,
    }
    state.household.availableSupplies = ['books']

    saveAppState(storage, state)

    expect(loadAppState(storage).household.children[0]?.name).toBe('Ava')
    expect(loadAppState(storage).household.availableSupplies).toEqual(['books'])
  })

  it('falls back to defaults when stored data is malformed', () => {
    const storage = new MemoryStorage()
    storage.setItem(APP_STATE_STORAGE_KEY, 'not-json')

    expect(loadAppState(storage).household.children[0]?.name).toBe('Mara')
  })

  it('clears persisted state', () => {
    const storage = new MemoryStorage()
    saveAppState(storage, createDefaultAppState())
    clearAppState(storage)

    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBeNull()
  })
})

