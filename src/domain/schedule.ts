import type { ScheduleBlock, ScheduleBlockStatus } from './types'

export function toMinutes(time: string): number {
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(time)
  const hours = Number(match?.[1])
  const minutes = Number(match?.[2] ?? 0)

  if (!match || hours > 23 || minutes > 59) {
    throw new RangeError('Time must be between 00:00 and 23:59')
  }

  return hours * 60 + minutes
}

export function formatTime(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) {
    throw new RangeError('Minutes must be a whole number between 0 and 1439')
  }

  const hour24 = Math.floor(minutes / 60)
  const minute = minutes % 60
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12

  return `${hour12}:${minute.toString().padStart(2, '0')} ${suffix}`
}

export function findCurrentBlock(
  blocks: ScheduleBlock[],
  nowMinutes: number,
): ScheduleBlock | undefined {
  return blocks.find(
    (block) => nowMinutes >= block.startMinutes && nowMinutes < block.endMinutes,
  )
}

export function findNextFlexibleBlock(
  blocks: ScheduleBlock[],
  nowMinutes: number,
): ScheduleBlock | undefined {
  return blocks.find(
    (block) =>
      block.endMinutes > nowMinutes &&
      !block.locked &&
      block.type !== 'fixed' &&
      block.type !== 'unavailable',
  )
}

export function getAvailableMinutes(
  block: ScheduleBlock | undefined,
  nowMinutes: number,
): number {
  if (!block) {
    return 30
  }

  const start = Math.max(nowMinutes, block.startMinutes)
  return Math.max(0, block.endMinutes - start)
}

export function assignActivityToBlock(
  blocks: ScheduleBlock[],
  blockId: string,
  activityId: string,
): ScheduleBlock[] {
  return blocks.map((block) =>
    block.id === blockId && !block.locked && block.type !== 'fixed' && block.type !== 'unavailable'
      ? {
          ...block,
          assignedActivityId: activityId,
          status: 'planned',
          type: 'activity',
        }
      : block,
  )
}

export function updateBlockStatus(
  blocks: ScheduleBlock[],
  blockId: string,
  status: ScheduleBlockStatus,
): ScheduleBlock[] {
  return blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          status,
        }
      : block,
  )
}

/** Parent-edited blocks must fit one day without silently displacing another block. */
export function editSchedule(blocks: ScheduleBlock[], edited: ScheduleBlock): ScheduleBlock[] {
  if (!edited.id || !edited.label.trim()) throw new Error('Add a schedule label.')
  if (!Number.isInteger(edited.startMinutes) || !Number.isInteger(edited.endMinutes) || edited.startMinutes < 0 || edited.endMinutes >= 1440 || edited.startMinutes >= edited.endMinutes) {
    throw new Error('Choose an end time after the start time, within the same day.')
  }
  if (blocks.some((block) => block.id !== edited.id && edited.startMinutes < block.endMinutes && edited.endMinutes > block.startMinutes)) {
    throw new Error('That time overlaps another block. Edit its times first.')
  }
  return [...blocks.filter((block) => block.id !== edited.id), { ...edited, label: edited.label.trim() }]
    .sort((a, b) => a.startMinutes - b.startMinutes)
}
