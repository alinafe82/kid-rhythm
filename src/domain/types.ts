export type EnergyLevel = 'calm' | 'moderate' | 'active'

export type ActivityCategory =
  | 'creative'
  | 'movement'
  | 'reading'
  | 'pretend'
  | 'sensory'
  | 'chore'
  | 'learning'
  | 'outdoor'
  | 'social'
  | 'independent'

export type SupervisionLevel = 'independent' | 'nearby' | 'active'
export type BurdenLevel = 'none' | 'low' | 'medium' | 'high'
export type ActivitySetting = 'indoor' | 'outdoor' | 'either'
export type SiblingFit = 'solo' | 'siblings' | 'either'
export type TimePeriod = 'morning' | 'midday' | 'afternoon' | 'evening'

export interface AgeRange {
  min: number
  max: number
}

export interface DurationRange {
  min: number
  max: number
}

export interface Activity {
  id: string
  title: string
  description: string
  ageRange: AgeRange
  duration: DurationRange
  energy: EnergyLevel
  category: ActivityCategory
  supervision: SupervisionLevel
  setupBurden: BurdenLevel
  cleanupBurden: BurdenLevel
  messLevel: BurdenLevel
  supplies: string[]
  setting: ActivitySetting
  safetyNotes: string
  transitionNotes: string
  siblingFit: SiblingFit
  repeatCooldownHours: number
  tags: string[]
}

export interface ChildProfile {
  id: string
  name: string
  age: number
}

export type FeedbackRating =
  | 'worked'
  | 'too-hard'
  | 'too-messy'
  | 'too-much-supervision'
  | 'disliked'
  | 'try-later'

export interface ActivityFeedback {
  activityId: string
  rating: FeedbackRating
  contextPeriod: TimePeriod
  timestamp: string
  note?: string
}

export interface RecentActivity {
  activityId: string
  category: ActivityCategory
  completedAtMinutesAgo: number
}

export interface HouseholdProfile {
  children: ChildProfile[]
  availableSupplies: string[]
  blockedActivityIds: string[]
  feedback: ActivityFeedback[]
  recentlyCompleted: RecentActivity[]
}

export type ScheduleBlockType =
  | 'fixed'
  | 'guided'
  | 'activity'
  | 'open'
  | 'unavailable'

export type ScheduleBlockStatus =
  | 'planned'
  | 'active'
  | 'completed'
  | 'skipped'
  | 'moved'

export interface ScheduleBlock {
  id: string
  label: string
  type: ScheduleBlockType
  startMinutes: number
  endMinutes: number
  locked: boolean
  status: ScheduleBlockStatus
  preferredCategory?: ActivityCategory
  preferredEnergy?: EnergyLevel
  assignedActivityId?: string
}

export interface RecommendationContext {
  nowMinutes: number
  availableMinutes: number
  desiredEnergy: EnergyLevel
  supervisionAvailability: SupervisionLevel
  setting: ActivitySetting
  currentBlock?: ScheduleBlock
}

export interface ActivityRecommendation {
  activity: Activity
  score: number
  reasons: string[]
  cautions: string[]
}

