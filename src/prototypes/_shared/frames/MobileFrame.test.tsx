import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MobileFrame from './MobileFrame'

describe('MobileFrame', () => {
  it('renders children inside the screen area', () => {
    render(
      <MobileFrame>
        <div data-testid="proto-content">hello</div>
      </MobileFrame>
    )
    expect(screen.getByTestId('proto-content')).toBeInTheDocument()
  })

  it('renders without throwing when no wrapping style is present', () => {
    // No <div className={wireframe.root}> wrapper.
    // Verifies CSS-variable fallbacks work and the component is self-sufficient.
    expect(() =>
      render(
        <MobileFrame>
          <div />
        </MobileFrame>
      )
    ).not.toThrow()
  })

  it('exposes the screen as an identifiable region', () => {
    render(
      <MobileFrame>
        <div data-testid="proto-content">hello</div>
      </MobileFrame>
    )
    const content = screen.getByTestId('proto-content')
    // The screen wrapper is the parent of the content
    expect(content.parentElement?.getAttribute('data-mobile-screen')).toBe('true')
  })
})
