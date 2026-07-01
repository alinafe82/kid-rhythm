import { describe, expect, it } from 'vitest'
import { initialSchedule } from '../data/demoHousehold'
import {
  assignActivityToBlock,
  findCurrentBlock,
  findNextFlexibleBlock,
  formatTime,
  getAvailableMinutes,
  toMinutes,
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
})

