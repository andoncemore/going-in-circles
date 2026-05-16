import { describe, it, expect } from 'vitest'
import { prototypes } from './prototypes'

describe('prototypes registry', () => {
  it('is an array', () => {
    expect(Array.isArray(prototypes)).toBe(true)
  })

  it('each entry has required string fields and a path starting with /prototypes/', () => {
    prototypes.forEach((prototype) => {
      expect(typeof prototype.name).toBe('string')
      expect(typeof prototype.description).toBe('string')
      expect(typeof prototype.path).toBe('string')
      expect(prototype.path).toMatch(/^\/prototypes\//)
      // React lazy components are objects with _init, not plain functions
      expect(prototype.component).toBeDefined()
      expect(typeof prototype.component).toBe('object')
    })
  })
})
