import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WidgetLayout from './WidgetLayout'

function renderLayout() {
  return render(
    <MemoryRouter>
      <WidgetLayout
        sidebar={<div>Sidebar content</div>}
        main={<div>Main content</div>}
      />
    </MemoryRouter>
  )
}

describe('WidgetLayout', () => {
  it('renders sidebar content', () => {
    renderLayout()
    expect(screen.getByText('Sidebar content')).toBeInTheDocument()
  })

  it('renders main content', () => {
    renderLayout()
    expect(screen.getByText('Main content')).toBeInTheDocument()
  })

  it('renders a back link to the home page', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /back to all tools/i })).toBeInTheDocument()
  })
})
