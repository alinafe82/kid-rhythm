import type {
  Activity,
  ActivityRecommendation,
  BurdenLevel,
  EnergyLevel,
  FeedbackRating,
  HouseholdProfile,
  RecommendationContext,
  SupervisionLevel,
  TimePeriod,
} from './types'

const supervisionRank: Record<SupervisionLevel, number> = {
  independent: 0,
  nearby: 1,
  active: 2,
}

const burdenRank: Record<BurdenLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
}

const feedbackWeights: Record<FeedbackRating, number> = {
  worked: 18,
  'too-hard': -16,
  'too-messy': -16,
  'too-much-supervision': -14,
  disliked: -18,
  'try-later': -6,
}

export function getTimePeriod(minutes: number): TimePeriod {
  if (minutes < 11 * 60) {
    return 'morning'
  }

  if (minutes < 14 * 60) {
    return 'midday'
  }

  if (minutes < 17 * 60) {
    return 'afternoon'
  }

  return 'evening'
}

export function rankActivities(
  activities: Activity[],
  household: HouseholdProfile,
  context: RecommendationContext,
  limit = 5,
): ActivityRecommendation[] {
  return activities
    .map((activity) => scoreActivity(activity, household, context))
    .filter((result): result is ActivityRecommendation => Boolean(result))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
}

export function scoreActivity(
  activity: Activity,
  household: HouseholdProfile,
  context: RecommendationContext,
): ActivityRecommendation | null {
  if (household.blockedActivityIds.includes(activity.id)) {
    return null
  }

  if (!isAgeFit(activity, household)) {
    return null
  }

  if (!hasRequiredSupplies(activity, household)) {
    return null
  }

  if (!settingFits(activity, context)) {
    return null
  }

  if (
    supervisionRank[activity.supervision] >
    supervisionRank[context.supervisionAvailability]
  ) {
    return null
  }

  if (activity.duration.min > context.availableMinutes) {
    return null
  }

  const reasons = new Set<string>()
  const cautions = new Set<string>()
  let score = 50

  if (context.availableMinutes <= activity.duration.max + 15) {
    score += 14
    reasons.add(`Fits the ${context.availableMinutes} minute window.`)
  } else {
    score += 4
  }

  score += scoreEnergy(activity.energy, context.desiredEnergy, reasons)
  score += scoreBurden(activity, context, reasons)
  score += scoreSchedulePreference(activity, context, reasons)
  score += scoreTimeOfDay(activity, context.nowMinutes, reasons)
  score += scoreFeedback(activity, household, context, reasons, cautions)
  score += scoreRecency(activity, household, reasons, cautions)

  if (activity.cleanupBurden === 'high' || activity.messLevel === 'high') {
    cautions.add('Expect cleanup time.')
  }

  if (activity.safetyNotes) {
    cautions.add(activity.safetyNotes)
  }

  return {
    activity,
    score: Math.round(score),
    reasons: Array.from(reasons),
    cautions: Array.from(cautions).slice(0, 3),
  }
}

function isAgeFit(activity: Activity, household: HouseholdProfile): boolean {
  return household.children.every(
    (child) =>
      child.age >= activity.ageRange.min && child.age <= activity.ageRange.max,
  )
}

function hasRequiredSupplies(
  activity: Activity,
  household: HouseholdProfile,
): boolean {
  return activity.supplies.every((supply) =>
    household.availableSupplies.includes(supply),
  )
}

function settingFits(
  activity: Activity,
  context: RecommendationContext,
): boolean {
  return (
    context.setting === 'either' ||
    activity.setting === 'either' ||
    activity.setting === context.setting
  )
}

function scoreEnergy(
  activityEnergy: EnergyLevel,
  desiredEnergy: EnergyLevel,
  reasons: Set<string>,
): number {
  if (activityEnergy === desiredEnergy) {
    reasons.add(`${capitalize(activityEnergy)} fits the current energy target.`)
    return 20
  }

  if (
    (activityEnergy === 'moderate' && desiredEnergy !== 'moderate') ||
    (desiredEnergy === 'moderate' && activityEnergy !== 'moderate')
  ) {
    return 8
  }

  return -10
}

function scoreBurden(
  activity: Activity,
  context: RecommendationContext,
  reasons: Set<string>,
): number {
  let score = 0

  if (
    context.supervisionAvailability !== 'active' &&
    activity.supervision === 'independent'
  ) {
    score += 10
    reasons.add('Can run with light parent involvement.')
  }

  if (burdenRank[activity.setupBurden] <= 1) {
    score += 8
    reasons.add('Low setup.')
  }

  if (burdenRank[activity.cleanupBurden] <= 1) {
    score += 4
  }

  return score
}

function scoreSchedulePreference(
  activity: Activity,
  context: RecommendationContext,
  reasons: Set<string>,
): number {
  const block = context.currentBlock

  if (!block) {
    return 0
  }

  let score = 0

  if (block.preferredEnergy && block.preferredEnergy === activity.energy) {
    score += 12
    reasons.add(`Matches ${block.label.toLowerCase()}.`)
  }

  if (block.preferredCategory && block.preferredCategory === activity.category) {
    score += 12
    reasons.add(`Matches the planned ${activity.category} block.`)
  }

  return score
}

function scoreTimeOfDay(
  activity: Activity,
  nowMinutes: number,
  reasons: Set<string>,
): number {
  const period = getTimePeriod(nowMinutes)

  if (
    period === 'morning' &&
    (activity.energy === 'active' || activity.category === 'movement')
  ) {
    reasons.add('Morning is a strong fit for movement.')
    return 10
  }

  if (
    period === 'midday' &&
    (activity.energy === 'calm' ||
      activity.category === 'reading' ||
      activity.category === 'creative')
  ) {
    reasons.add('Works well after lunch or quiet time.')
    return 10
  }

  if (
    period === 'afternoon' &&
    (activity.category === 'creative' || activity.category === 'chore')
  ) {
    reasons.add('Good fit for the afternoon reset.')
    return 8
  }

  return 0
}

function scoreFeedback(
  activity: Activity,
  household: HouseholdProfile,
  context: RecommendationContext,
  reasons: Set<string>,
  cautions: Set<string>,
): number {
  const currentPeriod = getTimePeriod(context.nowMinutes)
  let score = 0

  for (const feedback of household.feedback) {
    if (feedback.activityId !== activity.id) {
      continue
    }

    const periodMultiplier = feedback.contextPeriod === currentPeriod ? 1.25 : 1
    score += feedbackWeights[feedback.rating] * periodMultiplier

    if (feedback.rating === 'worked') {
      reasons.add('This has worked for the household before.')
    }

    if (feedback.rating === 'too-messy') {
      cautions.add('Past feedback marked this as messy.')
    }

    if (feedback.rating === 'too-much-supervision') {
      cautions.add('Past feedback needed more adult help.')
    }
  }

  return score
}

function scoreRecency(
  activity: Activity,
  household: HouseholdProfile,
  reasons: Set<string>,
  cautions: Set<string>,
): number {
  let score = 0

  for (const recent of household.recentlyCompleted) {
    const hoursAgo = recent.completedAtMinutesAgo / 60

    if (recent.activityId === activity.id && hoursAgo < activity.repeatCooldownHours) {
      score -= 35
      cautions.add('Recently used; better as a backup.')
    }

    if (recent.category === activity.category && recent.activityId !== activity.id) {
      score -= 6
    }
  }

  if (score === 0) {
    reasons.add('Adds variety to the recent queue.')
  }

  return score
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
