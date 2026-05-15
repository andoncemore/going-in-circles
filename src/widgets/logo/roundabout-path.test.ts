import { describe, it, expect } from 'vitest'
import { ROUNDABOUT_PATH, ROUNDABOUT_NATIVE_WIDTH, ROUNDABOUT_NATIVE_HEIGHT } from './roundabout-path'

describe('roundabout path constant', () => {
  it('exports native dimensions of 320 × 42', () => {
    expect(ROUNDABOUT_NATIVE_WIDTH).toBe(320)
    expect(ROUNDABOUT_NATIVE_HEIGHT).toBe(42)
  })

  it('exports a non-empty path d string starting with a move command', () => {
    expect(typeof ROUNDABOUT_PATH).toBe('string')
    expect(ROUNDABOUT_PATH.length).toBeGreaterThan(100)
    expect(ROUNDABOUT_PATH.trim()[0]).toMatch(/[Mm]/)
  })
})
