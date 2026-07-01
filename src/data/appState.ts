import { demoHousehold, initialSchedule } from './demoHousehold'
import type {
  ActivityCategory,
  ChildProfile,
  ChildSignals,
  HouseholdProfile,
  ScheduleBlock,
} from '../domain/types'

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

const energyLevels = ['calm', 'moderate', 'active'] as const
const transitionNeeds = ['easy', 'warmup', 'sensitive'] as const
const independenceNeeds = ['independent', 'nearby', 'together'] as const
const burdenLevels = ['none', 'low', 'medium', 'high'] as const
const sensoryNeeds = ['low-stimulus', 'balanced', 'sensory-seeking'] as const
const activityCategories = [
  'creative',
  'movement',
  'reading',
  'pretend',
  'sensory',
  'chore',
  'learning',
  'outdoor',
  'social',
  'independent',
] as const satisfies readonly ActivityCategory[]

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

export function createDefaultChildSignals(): ChildSignals {
  return {
    preferredEnergy: 'moderate',
    transitionNeed: 'warmup',
    independence: 'nearby',
    messTolerance: 'medium',
    sensoryNeed: 'balanced',
    interests: ['creative', 'movement', 'reading'],
  }
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
      ? household.children.map(normalizeChild)
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

function normalizeChild(child: unknown): ChildProfile {
  const defaults: ChildProfile = {
    id: `child-${Date.now()}`,
    name: 'Child',
    age: 6,
    signals: createDefaultChildSignals(),
  }

  if (!isRecord(child)) {
    return defaults
  }

  return {
    id: typeof child.id === 'string' ? child.id : defaults.id,
    name: typeof child.name === 'string' ? child.name : defaults.name,
    age: typeof child.age === 'number' ? child.age : defaults.age,
    signals: normalizeSignals(child.signals),
  }
}

function normalizeSignals(signals: unknown): ChildSignals {
  const defaults = createDefaultChildSignals()

  if (!isRecord(signals)) {
    return defaults
  }

  return {
    preferredEnergy: hasKnownValue(energyLevels, signals.preferredEnergy)
      ? signals.preferredEnergy
      : defaults.preferredEnergy,
    transitionNeed: hasKnownValue(transitionNeeds, signals.transitionNeed)
      ? signals.transitionNeed
      : defaults.transitionNeed,
    independence: hasKnownValue(independenceNeeds, signals.independence)
      ? signals.independence
      : defaults.independence,
    messTolerance: hasKnownValue(burdenLevels, signals.messTolerance)
      ? signals.messTolerance
      : defaults.messTolerance,
    sensoryNeed: hasKnownValue(sensoryNeeds, signals.sensoryNeed)
      ? signals.sensoryNeed
      : defaults.sensoryNeed,
    interests: Array.isArray(signals.interests)
      ? normalizeInterests(signals.interests)
      : defaults.interests,
  }
}

function normalizeInterests(interests: unknown[]): ActivityCategory[] {
  return Array.from(
    new Set(
      interests.filter((interest): interest is ActivityCategory =>
        hasKnownValue(activityCategories, interest),
      ),
    ),
  )
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

function hasKnownValue<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return typeof value === 'string' && values.includes(value as T)
}
