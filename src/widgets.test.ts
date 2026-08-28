import { describe, it, expect } from 'vitest'
import { widgets } from './widgets'

describe('widgets registry', () => {
  it('is an array', () => {
    expect(Array.isArray(widgets)).toBe(true)
  })

  it('registers the Chicago logo generator', () => {
    const entry = widgets.find((widget) => widget.path === '/chicago-logo')
    expect(entry).toBeDefined()
    expect(entry!.name).toBe('Chicago Logo Generator')
  })

  it('each entry has required string fields and a path starting with /', () => {
    widgets.forEach((widget) => {
      expect(typeof widget.name).toBe('string')
      expect(typeof widget.description).toBe('string')
      expect(typeof widget.path).toBe('string')
      expect(widget.path).toMatch(/^\//)
      // React lazy components are objects with _init, not plain functions
      expect(widget.component).toBeDefined()
      expect(typeof widget.component).toBe('object')
    })
  })
})
