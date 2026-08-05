import type { AppState } from '../data/appState'
import { getTimePeriod } from './recommendation'
import { assignActivityToBlock, updateBlockStatus } from './schedule'
import type {
  Activity,
  ActivityCategory,
  ChildProfile,
  ChildSignals,
  FamilyNote,
  FeedbackRating,
  MealPlanEntry,
} from './types'

export type OrganizerItemListName = 'groceryItems' | 'todoItems'

export type PlannerAction =
  | { type: 'start-activity'; blockId: string; activityId: string }
  | { type: 'schedule-activity'; blockId: string; activityId: string }
  | {
      type: 'record-feedback'
      activity: Activity
      rating: FeedbackRating
      nowMinutes: number
      timestamp: string
    }
  | { type: 'update-child'; childId: string; patch: Partial<ChildProfile> }
  | { type: 'add-child'; child: ChildProfile }
  | {
      type: 'update-child-signals'
      childId: string
      patch: Partial<ChildSignals>
    }
  | {
      type: 'toggle-child-interest'
      childId: string
      category: ActivityCategory
    }
  | { type: 'remove-child'; childId: string }
  | { type: 'toggle-supply'; supply: string }
  | {
      type: 'add-organizer-item'
      listName: OrganizerItemListName
      id: string
      text: string
    }
  | {
      type: 'toggle-organizer-item'
      listName: OrganizerItemListName
      itemId: string
    }
  | {
      type: 'remove-organizer-item'
      listName: OrganizerItemListName
      itemId: string
    }
  | { type: 'add-meal'; entry: MealPlanEntry }
  | { type: 'remove-meal'; entryId: string }
  | { type: 'add-note'; note: FamilyNote }
  | { type: 'remove-note'; noteId: string }
  | { type: 'toggle-blocked-activity'; activityId: string }

export function applyPlannerAction(
  state: AppState,
  action: PlannerAction,
): AppState {
  switch (action.type) {
    case 'start-activity':
      return {
        ...state,
        schedule: updateBlockStatus(
          assignActivityToBlock(state.schedule, action.blockId, action.activityId),
          action.blockId,
          'active',
        ),
      }
    case 'schedule-activity':
      return {
        ...state,
        schedule: assignActivityToBlock(
          state.schedule,
          action.blockId,
          action.activityId,
        ),
      }
    case 'record-feedback':
      return {
        ...state,
        household: {
          ...state.household,
          feedback: [
            {
              activityId: action.activity.id,
              rating: action.rating,
              contextPeriod: getTimePeriod(action.nowMinutes),
              timestamp: action.timestamp,
            },
            ...state.household.feedback,
          ],
          recentlyCompleted:
            action.rating === 'worked'
              ? [
                  {
                    activityId: action.activity.id,
                    category: action.activity.category,
                    completedAtMinutesAgo: 0,
                  },
                  ...state.household.recentlyCompleted,
                ]
              : state.household.recentlyCompleted,
        },
      }
    case 'update-child':
      return updateHousehold(state, (household) => ({
        ...household,
        children: household.children.map((child) =>
          child.id === action.childId ? { ...child, ...action.patch } : child,
        ),
      }))
    case 'add-child':
      return updateHousehold(state, (household) => ({
        ...household,
        children: [...household.children, action.child],
      }))
    case 'update-child-signals':
      return updateHousehold(state, (household) => ({
        ...household,
        children: household.children.map((child) =>
          child.id === action.childId
            ? {
                ...child,
                signals: { ...child.signals, ...action.patch },
              }
            : child,
        ),
      }))
    case 'toggle-child-interest':
      return updateHousehold(state, (household) => ({
        ...household,
        children: household.children.map((child) => {
          if (child.id !== action.childId) return child
          const interests = child.signals.interests.includes(action.category)
            ? child.signals.interests.filter(
                (category) => category !== action.category,
              )
            : [...child.signals.interests, action.category].sort()
          return { ...child, signals: { ...child.signals, interests } }
        }),
      }))
    case 'remove-child':
      if (state.household.children.length === 1) return state
      return updateHousehold(state, (household) => ({
        ...household,
        children: household.children.filter(
          (child) => child.id !== action.childId,
        ),
      }))
    case 'toggle-supply':
      return updateHousehold(state, (household) => ({
        ...household,
        availableSupplies: household.availableSupplies.includes(action.supply)
          ? household.availableSupplies.filter(
              (supply) => supply !== action.supply,
            )
          : [...household.availableSupplies, action.supply].sort(),
      }))
    case 'add-organizer-item': {
      const text = action.text.trim()
      if (!text) return state
      return updateOrganizer(state, (organizer) => ({
        ...organizer,
        [action.listName]: [
          ...organizer[action.listName],
          { id: action.id, text, completed: false },
        ],
      }))
    }
    case 'toggle-organizer-item':
      return updateOrganizer(state, (organizer) => ({
        ...organizer,
        [action.listName]: organizer[action.listName].map((item) =>
          item.id === action.itemId
            ? { ...item, completed: !item.completed }
            : item,
        ),
      }))
    case 'remove-organizer-item':
      return updateOrganizer(state, (organizer) => ({
        ...organizer,
        [action.listName]: organizer[action.listName].filter(
          (item) => item.id !== action.itemId,
        ),
      }))
    case 'add-meal': {
      const dayLabel = action.entry.dayLabel.trim()
      const meal = action.entry.meal.trim()
      if (!dayLabel || !meal) return state
      return updateOrganizer(state, (organizer) => ({
        ...organizer,
        mealPlan: [
          ...organizer.mealPlan,
          {
            ...action.entry,
            dayLabel,
            meal,
            notes: action.entry.notes?.trim() || undefined,
          },
        ],
      }))
    }
    case 'remove-meal':
      return updateOrganizer(state, (organizer) => ({
        ...organizer,
        mealPlan: organizer.mealPlan.filter(
          (entry) => entry.id !== action.entryId,
        ),
      }))
    case 'add-note': {
      const title = action.note.title.trim()
      const body = action.note.body.trim()
      if (!title || !body) return state
      return updateOrganizer(state, (organizer) => ({
        ...organizer,
        notes: [...organizer.notes, { ...action.note, title, body }],
      }))
    }
    case 'remove-note':
      return updateOrganizer(state, (organizer) => ({
        ...organizer,
        notes: organizer.notes.filter((note) => note.id !== action.noteId),
      }))
    case 'toggle-blocked-activity':
      return updateHousehold(state, (household) => ({
        ...household,
        blockedActivityIds: household.blockedActivityIds.includes(
          action.activityId,
        )
          ? household.blockedActivityIds.filter(
              (activityId) => activityId !== action.activityId,
            )
          : [...household.blockedActivityIds, action.activityId],
      }))
  }
}

function updateHousehold(
  state: AppState,
  update: (household: AppState['household']) => AppState['household'],
): AppState {
  return { ...state, household: update(state.household) }
}

function updateOrganizer(
  state: AppState,
  update: (organizer: AppState['organizer']) => AppState['organizer'],
): AppState {
  return { ...state, organizer: update(state.organizer) }
}
