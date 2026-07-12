import { describe, expect, it } from 'vitest'
import { initialSchedule } from '../data/demoHousehold'
import {
  assignActivityToBlock,
  findCurrentBlock,
  findNextFlexibleBlock,
  formatTime,
  getAvailableMinutes,
  toMinutes,
  updateBlockStatus,
} from './schedule'

describe('schedule helpers', () => {
  it('finds the current flexible block and remaining minutes', () => {
    const now = toMinutes('13:10')
    const block = findCurrentBlock(initialSchedule, now)

    expect(block?.id).toBe('quiet-reset')
    expect(getAvailableMinutes(block, now)).toBe(50)
  })

  it('falls forward to the next flexible block during fixed time', () => {
    const next = findNextFlexibleBlock(initialSchedule, toMinutes('12:10'))

    expect(next?.id).toBe('quiet-reset')
  })

  it('assigns an activity without mutating the original schedule', () => {
    const updated = assignActivityToBlock(
      initialSchedule,
      'quiet-reset',
      'reading-nest',
    )

    expect(
      initialSchedule.find((block) => block.id === 'quiet-reset')
        ?.assignedActivityId,
    ).toBeUndefined()
    expect(
      updated.find((block) => block.id === 'quiet-reset')?.assignedActivityId,
    ).toBe('reading-nest')
  })

  it('formats minutes as readable time labels', () => {
    expect(formatTime(toMinutes('13:05'))).toBe('1:05 PM')
  })

  it('handles missing blocks and short remaining windows', () => {
    const shortBlock = {
      ...initialSchedule[0]!,
      id: 'short',
      startMinutes: toMinutes('08:00'),
      endMinutes: toMinutes('08:05'),
    }

    expect(getAvailableMinutes(undefined, toMinutes('19:00'))).toBe(30)
    expect(getAvailableMinutes(shortBlock, toMinutes('08:04'))).toBe(10)
  })

  it('returns undefined when no current or future flexible block exists', () => {
    expect(findCurrentBlock(initialSchedule, toMinutes('23:00'))).toBeUndefined()
    expect(findNextFlexibleBlock(initialSchedule, toMinutes('18:30'))).toBeUndefined()
    expect(
      findNextFlexibleBlock(
        [
          {
            ...initialSchedule[0]!,
            type: 'unavailable',
            locked: false,
            status: 'planned',
          },
        ],
        toMinutes('08:00'),
      ),
    ).toBeUndefined()
  })

  it('updates block status without mutating other blocks', () => {
    const updated = updateBlockStatus(initialSchedule, 'quiet-reset', 'completed')

    expect(
      initialSchedule.find((block) => block.id === 'quiet-reset')?.status,
    ).toBe('active')
    expect(updated.find((block) => block.id === 'quiet-reset')?.status).toBe(
      'completed',
    )
    expect(updateBlockStatus(initialSchedule, 'missing', 'skipped')).toEqual(
      initialSchedule,
    )
  })

  it('handles compact and midnight time labels', () => {
    expect(toMinutes('7')).toBe(420)
    expect(formatTime(toMinutes('00:00'))).toBe('12:00 AM')
    expect(formatTime(toMinutes('12:00'))).toBe('12:00 PM')
  })
})
