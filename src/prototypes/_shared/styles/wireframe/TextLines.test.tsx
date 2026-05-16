import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import TextLines from './TextLines'

describe('TextLines', () => {
  it('renders 3 lines by default', () => {
    const { container } = render(<TextLines />)
    expect(container.querySelectorAll('[data-line]')).toHaveLength(3)
  })

  it('renders the requested count', () => {
    const { container } = render(<TextLines count={5} />)
    expect(container.querySelectorAll('[data-line]')).toHaveLength(5)
  })

  it('marks the last line', () => {
    const { container } = render(<TextLines count={3} />)
    const lines = container.querySelectorAll('[data-line]')
    expect(lines[lines.length - 1].getAttribute('data-last')).toBe('true')
    expect(lines[0].getAttribute('data-last')).toBe('false')
  })

  it('renders with the on-dark variant', () => {
    const { container } = render(<TextLines variant="on-dark" />)
    const first = container.querySelector('[data-line]')
    expect(first?.getAttribute('data-variant')).toBe('on-dark')
  })
})
