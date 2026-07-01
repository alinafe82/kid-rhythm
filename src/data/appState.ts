import { demoHousehold, initialSchedule } from './demoHousehold'
import type { HouseholdProfile, ScheduleBlock } from '../domain/types'

export const APP_STATE_STORAGE_KEY = 'kidrhythm:v1'

export interface AppState {
  household: HouseholdProfile
  schedule: ScheduleBlock[]
}

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function createDefaultAppState(): AppState {
  return cloneState({
    household: demoHousehold,
    schedule: initialSchedule,
  })
}

export function loadAppState(storage: StorageLike | undefined): AppState {
  if (!storage) {
    return createDefaultAppState()
  }

  try {
    const stored = storage.getItem(APP_STATE_STORAGE_KEY)

    if (!stored) {
      return createDefaultAppState()
    }

    const parsed = JSON.parse(stored) as Partial<AppState>
    const fallback = createDefaultAppState()

    return {
      household: normalizeHousehold(parsed.household, fallback.household),
      schedule: normalizeSchedule(parsed.schedule, fallback.schedule),
    }
  } catch {
    return createDefaultAppState()
  }
}

export function saveAppState(
  storage: StorageLike | undefined,
  state: AppState,
): void {
  if (!storage) {
    return
  }

  storage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state))
}

export function clearAppState(storage: StorageLike | undefined): void {
  storage?.removeItem(APP_STATE_STORAGE_KEY)
}

function normalizeHousehold(
  household: unknown,
  fallback: HouseholdProfile,
): HouseholdProfile {
  if (!isRecord(household)) {
    return fallback
  }

  return {
    children: Array.isArray(household.children)
      ? household.children
      : fallback.children,
    availableSupplies: Array.isArray(household.availableSupplies)
      ? household.availableSupplies
      : fallback.availableSupplies,
    blockedActivityIds: Array.isArray(household.blockedActivityIds)
      ? household.blockedActivityIds
      : fallback.blockedActivityIds,
    feedback: Array.isArray(household.feedback)
      ? household.feedback
      : fallback.feedback,
    recentlyCompleted: Array.isArray(household.recentlyCompleted)
      ? household.recentlyCompleted
      : fallback.recentlyCompleted,
  }
}

function normalizeSchedule(
  schedule: unknown,
  fallback: ScheduleBlock[],
): ScheduleBlock[] {
  return Array.isArray(schedule) && schedule.length > 0 ? schedule : fallback
}

function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
