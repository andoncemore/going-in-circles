import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import MapController from './MapController'
import type { LatLngBounds } from 'leaflet'

const mockFitBounds = vi.fn()

vi.mock('react-leaflet', () => ({
  useMap: () => ({ fitBounds: mockFitBounds }),
}))

describe('MapController', () => {
  beforeEach(() => {
    mockFitBounds.mockClear()
  })

  it('calls fitBounds with padding when bounds is provided', () => {
    const mockBounds = {} as LatLngBounds
    render(<MapController bounds={mockBounds} />)
    expect(mockFitBounds).toHaveBeenCalledWith(mockBounds, { padding: [80, 80] })
  })

  it('does not call fitBounds when bounds is null', () => {
    render(<MapController bounds={null} />)
    expect(mockFitBounds).not.toHaveBeenCalled()
  })

  it('calls fitBounds again when bounds reference changes', () => {
    const bounds1 = { id: 1 } as unknown as LatLngBounds
    const bounds2 = { id: 2 } as unknown as LatLngBounds
    const { rerender } = render(<MapController bounds={bounds1} />)
    rerender(<MapController bounds={bounds2} />)
    expect(mockFitBounds).toHaveBeenCalledTimes(2)
    expect(mockFitBounds).toHaveBeenLastCalledWith(bounds2, { padding: [80, 80] })
  })
})
