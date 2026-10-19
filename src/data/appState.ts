import { demoHousehold, demoOrganizer, initialSchedule } from './demoHousehold'
import type {
  ActivityCategory,
  ChildProfile,
  ChildSignals,
  FamilyNote,
  FamilyOrganizer,
  HouseholdProfile,
  MealPlanEntry,
  OrganizerItem,
  ScheduleBlock,
} from '../domain/types'

export const APP_STATE_STORAGE_KEY = 'kidrhythm:v1'

export interface AppState {
  dataOrigin?: 'sample' | 'personal'
  household: HouseholdProfile
  organizer: FamilyOrganizer
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
    dataOrigin: 'sample',
    household: demoHousehold,
    organizer: demoOrganizer,
    schedule: initialSchedule,
  })
}

export function createEmptyAppState(): AppState {
  return {
    dataOrigin: 'personal',
    household: { children: [], availableSupplies: [], blockedActivityIds: [], feedback: [], recentlyCompleted: [] },
    organizer: { groceryItems: [], todoItems: [], mealPlan: [], notes: [] },
    schedule: [],
  }
}

export interface PlannerLoadResult {
  state: AppState
  canPersist: boolean
  warning: string
}

// Read first, never replace unreadable bytes with starter data on mount.
export function loadPlannerState(storage: StorageLike | undefined): PlannerLoadResult {
  const empty = createEmptyAppState()
  if (!storage) return { state: empty, canPersist: false, warning: 'Browser storage is unavailable. Changes last only while this page stays open.' }
  try {
    const stored = storage.getItem(APP_STATE_STORAGE_KEY)
    if (!stored) return { state: empty, canPersist: true, warning: '' }
    return { state: parseStoredPlanner(stored), canPersist: true, warning: '' }
  } catch {
    return { state: empty, canPersist: false, warning: 'Saved planner data could not be read. It has been left untouched. Changes here are temporary; do not clear browser storage if you need to recover the saved data.' }
  }
}

export const MAX_BACKUP_BYTES = 1_000_000

/** Local backup and stored planner share the same validation and migration boundary. */
export function parsePlannerBackup(contents: string): AppState {
  if (new TextEncoder().encode(contents).length > MAX_BACKUP_BYTES) throw new Error('Backup must be no larger than 1 MB.')
  return parseStoredPlanner(contents)
}

function parseStoredPlanner(contents: string): AppState {
  const parsed: unknown = JSON.parse(contents)
  if (!isRecord(parsed) || !isRecord(parsed.household) || (parsed.organizer !== undefined && !isRecord(parsed.organizer)) || !Array.isArray(parsed.schedule)) {
    throw new Error('Unrecognized planner data')
  }
  if (!recognizedStoredArrays(parsed) || !uniqueStoredIds(parsed)) throw new Error('Unrecognized planner entries')
  const empty = createEmptyAppState()
  return {
    dataOrigin: parsed.dataOrigin === 'sample' ? 'sample' : 'personal',
    household: normalizeHousehold(parsed.household, empty.household),
    organizer: normalizeOrganizer(parsed.organizer, empty.organizer),
    schedule: parsed.schedule as ScheduleBlock[],
  }
}

// Reject malformed collections as a whole rather than erase individual family entries.
// Missing optional fields from older versions still use empty/default values in memory.
function recognizedStoredArrays(parsed: Record<string, unknown>): boolean {
  const household = parsed.household as Record<string, unknown>
  const organizer = parsed.organizer as Record<string, unknown> | undefined
  const strings = (value: unknown) => typeof value === 'string'
  const nonEmpty = (value: unknown) => typeof value === 'string' && value.trim().length > 0
  const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  const optionalString = (value: unknown) => value === undefined || strings(value)
  const array = (value: unknown, check: (entry: unknown) => boolean) => value === undefined || (Array.isArray(value) && value.every(check))
  const feedbackRatings = ['worked', 'too-hard', 'too-messy', 'too-much-supervision', 'disliked', 'try-later'] as const
  const periods = ['morning', 'midday', 'afternoon', 'evening'] as const
  const blockTypes = ['fixed', 'guided', 'activity', 'open', 'unavailable'] as const
  const statuses = ['planned', 'active', 'completed', 'skipped', 'moved'] as const
  return array(household.children, (entry) => isRecord(entry) && strings(entry.id) && strings(entry.name) && finite(entry.age))
    && array(household.availableSupplies, strings)
    && array(household.blockedActivityIds, strings)
    && array(household.feedback, (entry) => isRecord(entry) && strings(entry.activityId) && hasKnownValue(feedbackRatings, entry.rating) && hasKnownValue(periods, entry.contextPeriod) && strings(entry.timestamp) && optionalString(entry.note))
    && array(household.recentlyCompleted, (entry) => isRecord(entry) && strings(entry.activityId) && hasKnownValue(activityCategories, entry.category) && finite(entry.completedAtMinutesAgo))
    && array(organizer?.groceryItems, (entry) => isRecord(entry) && optionalString(entry.id) && nonEmpty(entry.text) && (entry.completed === undefined || typeof entry.completed === 'boolean'))
    && array(organizer?.todoItems, (entry) => isRecord(entry) && optionalString(entry.id) && nonEmpty(entry.text) && (entry.completed === undefined || typeof entry.completed === 'boolean'))
    && array(organizer?.mealPlan, (entry) => isRecord(entry) && optionalString(entry.id) && nonEmpty(entry.dayLabel) && nonEmpty(entry.meal) && optionalString(entry.notes))
    && array(organizer?.notes, (entry) => isRecord(entry) && optionalString(entry.id) && nonEmpty(entry.title) && nonEmpty(entry.body))
    && array(parsed.schedule, (entry) => isRecord(entry) && strings(entry.id) && strings(entry.label) && Number.isInteger(entry.startMinutes) && Number.isInteger(entry.endMinutes) && Number(entry.startMinutes) >= 0 && Number(entry.endMinutes) < 1440 && Number(entry.startMinutes) < Number(entry.endMinutes) && typeof entry.locked === 'boolean' && hasKnownValue(blockTypes, entry.type) && hasKnownValue(statuses, entry.status) && optionalString(entry.assignedActivityId) && (entry.preferredCategory === undefined || hasKnownValue(activityCategories, entry.preferredCategory)) && (entry.preferredEnergy === undefined || hasKnownValue(energyLevels, entry.preferredEnergy)))
}

function uniqueStoredIds(parsed: Record<string, unknown>): boolean {
  const household = parsed.household as Record<string, unknown>
  const organizer = parsed.organizer as Record<string, unknown> | undefined
  return [household.children, parsed.schedule, organizer?.groceryItems, organizer?.todoItems, organizer?.mealPlan, organizer?.notes].every((entries) => {
    const ids = new Set<string>()
    for (const entry of (entries as Record<string, unknown>[] | undefined) ?? []) {
      if (typeof entry.id !== 'string' || !entry.id) continue
      if (ids.has(entry.id)) return false
      ids.add(entry.id)
    }
    return true
  })
}

// Migration IDs are stable, per-collection, and cannot collide with a stored ID.
function withLegacyIds(entries: unknown[], collection: string): unknown[] {
  const ids = new Set(entries.flatMap((entry) => isRecord(entry) && typeof entry.id === 'string' && entry.id ? [entry.id] : []))
  return entries.map((entry, index) => {
    if (!isRecord(entry) || (typeof entry.id === 'string' && entry.id)) return entry
    const base = `legacy-${collection}-${index}`
    let id = base
    let suffix = 1
    while (ids.has(id)) id = `${base}-${suffix++}`
    ids.add(id)
    return { ...entry, id }
  })
}

export function loadAppState(storage: StorageLike | undefined, defaults = createDefaultAppState()): AppState {
  if (!storage) {
    return cloneState(defaults)
  }

  try {
    const stored = storage.getItem(APP_STATE_STORAGE_KEY)

    if (!stored) {
      return cloneState(defaults)
    }

    const parsed = JSON.parse(stored) as Partial<AppState>
    const fallback = cloneState(defaults)

    return {
      dataOrigin: parsed.dataOrigin === 'sample' ? 'sample' : 'personal',
      household: normalizeHousehold(parsed.household, fallback.household),
      organizer: normalizeOrganizer(parsed.organizer, fallback.organizer),
      schedule: normalizeSchedule(parsed.schedule, fallback.schedule),
    }
  } catch {
    return cloneState(defaults)
  }
}

export function saveAppState(
  storage: StorageLike | undefined,
  state: AppState,
): boolean {
  if (!storage) return false
  try {
    storage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
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

function normalizeOrganizer(
  organizer: unknown,
  fallback: FamilyOrganizer,
): FamilyOrganizer {
  if (!isRecord(organizer)) {
    return fallback
  }

  return {
    groceryItems: Array.isArray(organizer.groceryItems)
      ? withLegacyIds(organizer.groceryItems, 'groceries')
          .map(normalizeOrganizerItem)
          .filter((item): item is OrganizerItem => Boolean(item))
      : fallback.groceryItems,
    todoItems: Array.isArray(organizer.todoItems)
      ? withLegacyIds(organizer.todoItems, 'todos')
          .map(normalizeOrganizerItem)
          .filter((item): item is OrganizerItem => Boolean(item))
      : fallback.todoItems,
    mealPlan: Array.isArray(organizer.mealPlan)
      ? withLegacyIds(organizer.mealPlan, 'meals')
          .map(normalizeMealPlanEntry)
          .filter((entry): entry is MealPlanEntry => Boolean(entry))
      : fallback.mealPlan,
    notes: Array.isArray(organizer.notes)
      ? withLegacyIds(organizer.notes, 'notes')
          .map(normalizeFamilyNote)
          .filter((note): note is FamilyNote => Boolean(note))
      : fallback.notes,
  }
}

function normalizeOrganizerItem(item: unknown): OrganizerItem | undefined {
  if (!isRecord(item)) {
    return undefined
  }

  const text = typeof item.text === 'string' ? item.text.trim() : ''

  if (!text) {
    return undefined
  }

  return {
    id: item.id as string,
    text,
    completed: typeof item.completed === 'boolean' ? item.completed : false,
  }
}

function normalizeMealPlanEntry(entry: unknown): MealPlanEntry | undefined {
  if (!isRecord(entry)) {
    return undefined
  }

  const dayLabel =
    typeof entry.dayLabel === 'string' ? entry.dayLabel.trim() : ''
  const meal = typeof entry.meal === 'string' ? entry.meal.trim() : ''

  if (!dayLabel || !meal) {
    return undefined
  }

  return {
    id: entry.id as string,
    dayLabel,
    meal,
    notes:
      typeof entry.notes === 'string' && entry.notes.trim()
        ? entry.notes.trim()
        : undefined,
  }
}

function normalizeFamilyNote(note: unknown): FamilyNote | undefined {
  if (!isRecord(note)) {
    return undefined
  }

  const title = typeof note.title === 'string' ? note.title.trim() : ''
  const body = typeof note.body === 'string' ? note.body.trim() : ''

  if (!title || !body) {
    return undefined
  }

  return {
    id: note.id as string,
    title,
    body,
  }
}

function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasKnownValue<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return typeof value === 'string' && values.includes(value as T)
}
