import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

vi.mock('../widgets', () => ({
  widgets: [
    {
      name: 'Logo Generator',
      description: 'Create logos with custom inputs',
      path: '/logo-generator',
      component: () => null,
    },
    {
      name: 'Map Maker',
      description: 'Build styled map images',
      path: '/map-maker',
      component: () => null,
    },
  ],
}))

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

describe('Home', () => {
  it('renders a card for each widget in the registry', () => {
    renderHome()
    expect(screen.getByText('Logo Generator')).toBeInTheDocument()
    expect(screen.getByText('Map Maker')).toBeInTheDocument()
  })

  it('renders widget descriptions', () => {
    renderHome()
    expect(screen.getByText('Create logos with custom inputs')).toBeInTheDocument()
    expect(screen.getByText('Build styled map images')).toBeInTheDocument()
  })

  it('links each card to its widget path', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /logo generator/i })).toHaveAttribute('href', '/logo-generator')
    expect(screen.getByRole('link', { name: /map maker/i })).toHaveAttribute('href', '/map-maker')
  })
})
