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
  ],
}))

vi.mock('../prototypes', () => ({
  prototypes: [],
}))

describe('Home with empty prototypes registry', () => {
  it('hides the Prototypes section when the registry is empty', () => {
    render(<MemoryRouter><Home /></MemoryRouter>)
    expect(screen.queryByRole('heading', { name: 'Prototypes' })).not.toBeInTheDocument()
  })

  it('still renders the Tools section', () => {
    render(<MemoryRouter><Home /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Tools', level: 2 })).toBeInTheDocument()
  })
})
