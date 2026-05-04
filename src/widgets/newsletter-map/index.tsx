import { useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLngBounds } from 'leaflet'
import MapController from './MapController'
import { geocode, sleep, type Location, type GeocodeCache } from './geocode'
import WidgetLayout from '../../components/WidgetLayout'
import styles from './styles.module.css'

function makeBlankLocation(): Location {
  return { id: crypto.randomUUID(), name: '', address: '', lat: null, lng: null, error: false }
}

function createMarkerIcon(name: string, number: number) {
  return L.divIcon({
    className: '',
    html: `<div class="marker-wrap"><div class="marker-circle">${number}</div><div class="marker-label">${name}</div></div>`,
    iconAnchor: [15, 15],
    iconSize: [1, 1],
  })
}

export default function NewsletterMap() {
  const [locations, setLocations] = useState<Location[]>([
    makeBlankLocation(),
    makeBlankLocation(),
    makeBlankLocation(),
  ])
  const [bounds, setBounds] = useState<LatLngBounds | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasMap, setHasMap] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(true)
  const [statusMsg, setStatusMsg] = useState('')
  const geocodeCache = useRef<GeocodeCache>({})
  const mapWrapperRef = useRef<HTMLDivElement>(null)

  const geocodedLocations = locations.filter(l => l.lat !== null && l.lng !== null)

  function addLocation() {
    if (locations.length >= 10) return
    setLocations(prev => [...prev, makeBlankLocation()])
  }

  function removeLocation(id: string) {
    setLocations(prev => prev.filter(l => l.id !== id))
  }

  function updateField(id: string, field: 'name' | 'address', value: string) {
    setLocations(prev =>
      prev.map(l => {
        if (l.id !== id) return l
        if (field === 'address') return { ...l, address: value, lat: null, lng: null, error: false }
        return { ...l, [field]: value }
      })
    )
  }

  async function generateMap() {
    const filled = locations.filter(l => l.name.trim() && l.address.trim())
    if (filled.length === 0) return
    setIsGenerating(true)

    const updated = locations.map(l => ({ ...l }))
    let done = 0

    for (let i = 0; i < updated.length; i++) {
      const loc = updated[i]
      if (!loc.name.trim() || !loc.address.trim()) continue
      if (loc.lat !== null) { done++; continue }

      setStatusMsg(`Geocoding ${done + 1}/${filled.length}…`)
      const result = await geocode(loc.address, geocodeCache.current)
      if (result) {
        updated[i] = { ...loc, lat: result.lat, lng: result.lng, error: false }
        done++
      } else {
        updated[i] = { ...loc, error: true }
      }
      if (i < updated.length - 1) await sleep(300)
    }

    setLocations(updated)
    const successes = updated.filter(l => l.lat !== null && l.lng !== null)
    if (successes.length > 0) {
      setBounds(L.latLngBounds(successes.map(l => [l.lat!, l.lng!] as [number, number])))
      setHasMap(true)
    }
    setStatusMsg(`${successes.length} location${successes.length !== 1 ? 's' : ''} mapped`)
    setIsGenerating(false)
  }

  async function exportPNG() {
    if (!mapWrapperRef.current) return
    setOverlayVisible(false)

    try {
      await sleep(500)

      const { toCanvas } = await import('html-to-image')
      const canvas = await toCanvas(mapWrapperRef.current, { pixelRatio: 2 })

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = '#88A4AE'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-over'

      const link = document.createElement('a')
      link.download = 'newsletter-map.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setOverlayVisible(true)
    }
  }

  const sidebar = (
    <div className={styles.sidebarInner}>
      <h2 className={styles.title}>Newsletter Map</h2>
      <p className={styles.description}>Add locations, generate the map, then download as PNG.</p>
      <div className={styles.locationList}>
        {locations.map((loc, i) => (
          <div key={loc.id} className={styles.locationRow}>
            <div className={styles.locationBadge}>{i + 1}</div>
            <div className={styles.locationInputs}>
              <input
                className={styles.nameInput}
                placeholder="Location name"
                value={loc.name}
                onChange={e => updateField(loc.id, 'name', e.target.value)}
              />
              <input
                className={[
                  styles.addressInput,
                  loc.lat !== null ? styles.geocoded : '',
                  loc.error ? styles.error : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                placeholder="Address or place name"
                value={loc.address}
                onChange={e => updateField(loc.id, 'address', e.target.value)}
              />
            </div>
            {locations.length > 1 && (
              <button
                className={styles.removeBtn}
                onClick={() => removeLocation(loc.id)}
                aria-label="Remove location"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {locations.length < 10 && (
          <button className={styles.addBtn} onClick={addLocation}>
            + Add location
          </button>
        )}
      </div>
      {statusMsg && <p className={styles.status}>{statusMsg}</p>}
      <div className={styles.actions}>
        <button className={styles.generateBtn} onClick={generateMap} disabled={isGenerating}>
          {isGenerating ? 'Generating…' : 'Generate Map →'}
        </button>
        {hasMap && (
          <button className={styles.downloadBtn} onClick={exportPNG}>
            ↓ Download PNG
          </button>
        )}
      </div>
    </div>
  )

  const main = (
    <div className={styles.mapWrapper} ref={mapWrapperRef}>
      <MapContainer
        className={styles.map}
        center={[39.5, -98.35]}
        zoom={4}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://stamen.com/">Stamen Design</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {geocodedLocations.map((loc, i) => (
          <Marker
            key={loc.id}
            position={[loc.lat!, loc.lng!]}
            icon={createMarkerIcon(loc.name, i + 1)}
          />
        ))}
        <MapController bounds={bounds} />
      </MapContainer>
      {overlayVisible && <div className={styles.colorOverlay} />}
    </div>
  )

  return <WidgetLayout sidebar={sidebar} main={main} />
}
