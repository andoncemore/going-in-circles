import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NewsletterMap from './index'

// mockToCanvas must be declared with vi.hoisted so it exists when vi.mock factories run
const mockToCanvas = vi.hoisted(() => vi.fn())

// Mocks needed for Tasks 5–7 — set up here so Task 6/7 tests don't need to touch this section
vi.mock('html-to-image', () => ({ toCanvas: mockToCanvas }))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: () => null,
}))

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({})),
  },
}))

vi.mock('leaflet/dist/leaflet.css', () => ({}))
vi.mock('./MapController', () => ({ default: () => null }))
vi.mock('./geocode', () => ({
  geocode: vi.fn(),
  sleep: vi.fn().mockResolvedValue(undefined),
}))

function renderWidget() {
  return render(
    <MemoryRouter>
      <NewsletterMap />
    </MemoryRouter>
  )
}

describe('NewsletterMap — location list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 3 location rows on mount', () => {
    renderWidget()
    expect(screen.getAllByPlaceholderText('Location name')).toHaveLength(3)
  })

  it('adds a row when "+ Add location" is clicked', () => {
    renderWidget()
    fireEvent.click(screen.getByText('+ Add location'))
    expect(screen.getAllByPlaceholderText('Location name')).toHaveLength(4)
  })

  it('hides "+ Add location" when 10 rows exist', () => {
    renderWidget()
    for (let i = 0; i < 7; i++) fireEvent.click(screen.getByText('+ Add location'))
    expect(screen.queryByText('+ Add location')).toBeNull()
  })

  it('removes a row when × is clicked', () => {
    renderWidget()
    fireEvent.click(screen.getByText('+ Add location')) // 4 rows
    const removeBtns = screen.getAllByLabelText('Remove location')
    fireEvent.click(removeBtns[0])
    expect(screen.getAllByPlaceholderText('Location name')).toHaveLength(3)
  })

  it('hides all × buttons when only 1 row remains', () => {
    renderWidget()
    let btns = screen.getAllByLabelText('Remove location')
    fireEvent.click(btns[0])
    btns = screen.getAllByLabelText('Remove location')
    fireEvent.click(btns[0])
    expect(screen.queryAllByLabelText('Remove location')).toHaveLength(0)
  })

  it('updates the name field on input change', () => {
    renderWidget()
    const nameInputs = screen.getAllByPlaceholderText('Location name')
    fireEvent.change(nameInputs[0], { target: { value: 'City Hall' } })
    expect(nameInputs[0]).toHaveValue('City Hall')
  })

  it('does not show the Download PNG button initially', () => {
    renderWidget()
    expect(screen.queryByText(/Download PNG/)).toBeNull()
  })
})
