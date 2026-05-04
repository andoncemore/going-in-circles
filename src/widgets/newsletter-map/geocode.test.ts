import { describe, it, expect, vi, beforeEach } from 'vitest'
import { geocode } from './geocode'

describe('geocode', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns cached result without fetching', async () => {
    const cache = { 'New York': { lat: 40.7, lng: -74.0 } }
    const fetchSpy = vi.spyOn(global, 'fetch')

    const result = await geocode('New York', cache)

    expect(result).toEqual({ lat: 40.7, lng: -74.0 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fetches coordinates and stores them in cache on success', async () => {
    const cache: Record<string, { lat: number; lng: number }> = {}
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve([{ lat: '40.7128', lon: '-74.0060' }]),
    } as Response)

    const result = await geocode('New York, NY', cache)

    expect(result).toEqual({ lat: 40.7128, lng: -74.006 })
    expect(cache['New York, NY']).toEqual({ lat: 40.7128, lng: -74.006 })
  })

  it('returns null when Nominatim returns empty results', async () => {
    const cache: Record<string, { lat: number; lng: number }> = {}
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve([]),
    } as Response)

    const result = await geocode('xyzzy nowhere place', cache)

    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    const cache: Record<string, { lat: number; lng: number }> = {}
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const result = await geocode('New York', cache)

    expect(result).toBeNull()
  })
})
