import { describe, it, expect } from 'vitest'
import { slugify } from './export'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Hyde Park')).toBe('hyde-park')
  })

  it('falls back to "logo" for text with no usable characters', () => {
    expect(slugify('   ')).toBe('logo')
  })

  it('uses a caller-supplied fallback', () => {
    expect(slugify('', 'roundabout')).toBe('roundabout')
  })
})
