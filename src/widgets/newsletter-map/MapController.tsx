import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { LatLngBounds } from 'leaflet'

interface Props {
  bounds: LatLngBounds | null
}

export default function MapController({ bounds }: Props) {
  const map = useMap()

  useEffect(() => {
    if (!bounds) return
    map.fitBounds(bounds, { padding: [80, 80] })
  }, [bounds, map])

  return null
}
