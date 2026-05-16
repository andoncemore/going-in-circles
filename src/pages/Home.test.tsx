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

vi.mock('../prototypes', () => ({
  prototypes: [
    {
      name: 'Digital Flyer',
      description: 'A4 portrait newsletter mockup',
      path: '/prototypes/digital-flyer',
      component: () => null,
    },
    {
      name: 'Mobile Widget',
      description: 'phone-sized container test',
      path: '/prototypes/mobile-widget',
      component: () => null,
    },
  ],
}))

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

describe('Home', () => {
  it('renders a Tools section heading', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'Tools', level: 2 })).toBeInTheDocument()
  })

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

  it('links each widget card to its path', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /logo generator/i })).toHaveAttribute('href', '/logo-generator')
    expect(screen.getByRole('link', { name: /map maker/i })).toHaveAttribute('href', '/map-maker')
  })

  it('renders a Prototypes section heading when prototypes exist', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'Prototypes', level: 2 })).toBeInTheDocument()
  })

  it('renders each prototype as a link with name and description', () => {
    renderHome()
    expect(screen.getByText('Digital Flyer')).toBeInTheDocument()
    expect(screen.getByText('A4 portrait newsletter mockup')).toBeInTheDocument()
    expect(screen.getByText('Mobile Widget')).toBeInTheDocument()
    expect(screen.getByText('phone-sized container test')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /digital flyer/i })).toHaveAttribute('href', '/prototypes/digital-flyer')
    expect(screen.getByRole('link', { name: /mobile widget/i })).toHaveAttribute('href', '/prototypes/mobile-widget')
  })
})
