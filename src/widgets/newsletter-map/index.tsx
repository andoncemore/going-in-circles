import { useState, useRef } from 'react'
import { type Location, type GeocodeCache } from './geocode'
import WidgetLayout from '../../components/WidgetLayout'
import styles from './styles.module.css'

function makeBlankLocation(): Location {
  return { id: crypto.randomUUID(), name: '', address: '', lat: null, lng: null, error: false }
}

export default function NewsletterMap() {
  const [locations, setLocations] = useState<Location[]>([
    makeBlankLocation(),
    makeBlankLocation(),
    makeBlankLocation(),
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasMap, setHasMap] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const geocodeCache = useRef<GeocodeCache>({})
  const mapWrapperRef = useRef<HTMLDivElement>(null)

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

  async function generateMap() {}

  async function exportPNG() {}

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

  const main = <div className={styles.mapWrapper} ref={mapWrapperRef} />

  return <WidgetLayout sidebar={sidebar} main={main} />
}
