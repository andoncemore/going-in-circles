import { describe, it, expect } from 'vitest'
import { widgets } from './widgets'

describe('widgets registry', () => {
  it('is an array', () => {
    expect(Array.isArray(widgets)).toBe(true)
  })

  it('each entry has required string fields and a path starting with /', () => {
    widgets.forEach((widget) => {
      expect(typeof widget.name).toBe('string')
      expect(typeof widget.description).toBe('string')
      expect(typeof widget.path).toBe('string')
      expect(widget.path).toMatch(/^\//)
      expect(typeof widget.component).toBe('function')
    })
  })
})
