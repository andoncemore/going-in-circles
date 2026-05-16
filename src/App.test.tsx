import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('./prototypes', () => ({
  prototypes: [
    {
      name: 'Test Prototype',
      description: 'A prototype used only in tests',
      path: '/prototypes/test-proto',
      component: () => <div>test prototype content</div>,
    },
  ],
}))

describe('App', () => {
  it('renders the home page at /', () => {
    render(<App initialPath="/" />)
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })

  it('routes /prototypes/<slug> to the prototype component', () => {
    render(<App initialPath="/prototypes/test-proto" />)
    expect(screen.getByText('test prototype content')).toBeInTheDocument()
  })
})
