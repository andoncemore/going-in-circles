export interface Location {
  id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  error: boolean
}

export type GeocodeCache = Record<string, { lat: number; lng: number }>

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export async function geocode(
  address: string,
  cache: GeocodeCache
): Promise<{ lat: number; lng: number } | null> {
  if (cache[address]) return cache[address]

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await response.json()
    if (!data || data.length === 0) return null

    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    cache[address] = result
    return result
  } catch {
    return null
  }
}
