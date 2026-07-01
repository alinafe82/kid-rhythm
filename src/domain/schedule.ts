import type { ScheduleBlock, ScheduleBlockStatus } from './types'

export function toMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

export function formatTime(minutes: number): string {
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
  return Math.max(10, block.endMinutes - start)
}

export function assignActivityToBlock(
  blocks: ScheduleBlock[],
  blockId: string,
  activityId: string,
): ScheduleBlock[] {
  return blocks.map((block) =>
    block.id === blockId
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

