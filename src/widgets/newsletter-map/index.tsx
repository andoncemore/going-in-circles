import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Map, Marker } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import type { Map as MaplibreMap, GeoJSONSource } from 'maplibre-gl'
import type { LngLatBoundsLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { geocode, sleep, type Location, type GeocodeCache } from './geocode'
import WidgetLayout from '../../components/WidgetLayout'
import styles from './styles.module.css'
import tonerStyle from './toner-style.json'


const ASPECT_RATIOS = [
  { label: '1:1 — Square',          w: 1,  h: 1  },
  { label: '4:3 — Landscape',       w: 4,  h: 3  },
  { label: '3:4 — Portrait',        w: 3,  h: 4  },
  { label: '16:9 — Widescreen',     w: 16, h: 9  },
  { label: '9:16 — Story',          w: 9,  h: 16 },
  { label: '3:2 — Photo landscape', w: 3,  h: 2  },
  { label: '2:3 — Photo portrait',  w: 2,  h: 3  },
]

function makeBlankLocation(): Location {
  return { id: crypto.randomUUID(), name: '', address: '', lat: null, lng: null, error: false }
}

export default function NewsletterMap() {
  const [locations, setLocations] = useState<Location[]>([
    makeBlankLocation(),
    makeBlankLocation(),
    makeBlankLocation(),
  ])
  const [bounds, setBounds] = useState<LngLatBoundsLike | null>(null)
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0])
  const [layers, setLayers] = useState({ background: true, lines: true, labels: true, buildings: true })
  const [backgroundDetail, setBackgroundDetail] = useState(100)
  const [lineDetail, setLineDetail] = useState(0)
  const [labelDetail, setLabelDetail] = useState(0)
  const [markerFontSize, setMarkerFontSize] = useState(14)
  const [canvasContainer, setCanvasContainer] = useState<HTMLElement | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasMap, setHasMap] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const geocodeCache = useRef<GeocodeCache>({})
  const mapWrapperRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)
  const layerOriginsRef = useRef<{ lines: Record<string, number>; labels: Record<string, number> }>({
    lines: {}, labels: {},
  })
  const styleLoadedRef = useRef(false)

  const geocodedLocations = locations.filter(l => l.lat !== null && l.lng !== null)

  function toggleLayer(key: 'background' | 'lines' | 'labels' | 'buildings') {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

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

  const BUILDING_LAYER_IDS = new Set(['building', 'building-outline'])

  const LINE_FADE_RANGE = 2

  const applyLayerSettings = useCallback((map: MaplibreMap) => {
    const lineOffset = Math.abs(lineDetail)
    for (const [id, mz] of Object.entries(layerOriginsRef.current.lines)) {
      if (BUILDING_LAYER_IDS.has(id)) continue
      if (!layers.lines) {
        map.setLayoutProperty(id, 'visibility', 'none')
        continue
      }
      map.setLayoutProperty(id, 'visibility', 'visible')
      map.setLayerZoomRange(id, 0, 24)
      const threshold = mz + lineOffset
      const fadeStart = Math.max(0, threshold - LINE_FADE_RANGE)
      map.setPaintProperty(id, 'line-opacity',
        fadeStart >= threshold
          ? 1
          : ['interpolate', ['linear'], ['zoom'], fadeStart, 0, threshold, 1]
      )
    }

    // text-padding drives collision density: higher padding → labels compete for more
    // space → only highest-priority labels survive → fewer labels visible.
    // Exponential feels natural: small moves at low values, aggressive thinning at high.
    const textPadding = 2 * Math.pow(100, Math.abs(labelDetail) / 10)
    for (const [id, mz] of Object.entries(layerOriginsRef.current.labels)) {
      map.setLayoutProperty(id, 'visibility', layers.labels ? 'visible' : 'none')
      if (layers.labels) {
        map.setLayerZoomRange(id, mz, 24)
        map.setLayoutProperty(id, 'text-padding', textPadding)
      }
    }

    for (const layer of map.getStyle().layers) {
      if (BUILDING_LAYER_IDS.has(layer.id)) {
        map.setLayoutProperty(layer.id, 'visibility', layers.buildings ? 'visible' : 'none')
        continue
      }
      if (layer.type === 'fill' || layer.type === 'background') {
        map.setLayoutProperty(layer.id, 'visibility', layers.background ? 'visible' : 'none')
        if (layers.background && layer.type === 'fill') {
          map.setPaintProperty(layer.id, 'fill-opacity', backgroundDetail / 100)
        }
      }
    }
  }, [layers, lineDetail, labelDetail, backgroundDetail])

  function handleStyleLoad() {
    const map = mapRef.current?.getMap()
    if (!map) return
    const origins = { lines: {} as Record<string, number>, labels: {} as Record<string, number> }
    for (const layer of map.getStyle().layers) {
      const mz = (layer as { minzoom?: number }).minzoom ?? 0
      if (layer.type === 'line') origins.lines[layer.id] = mz
      else if (layer.type === 'symbol') origins.labels[layer.id] = mz
    }
    layerOriginsRef.current = origins

    // Invisible 30×30 icon whose collision box matches the HTML marker circle.
    // opacity: 0 keeps it off-canvas so it isn't tinted by the CSS overlay,
    // but MapLibre still runs collision detection against it.
    map.addImage('marker-ghost', { width: 30, height: 30, data: new Uint8Array(30 * 30 * 4) })
    map.addSource('markers', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map.addLayer({
      id: 'marker-collision',
      type: 'symbol',
      source: 'markers',
      layout: {
        'icon-image': 'marker-ghost',
        'icon-allow-overlap': true,
        'icon-ignore-placement': false,
        'text-field': ['get', 'name'],
        'text-size': 14,
        'text-font': ['TarnacSans-Bold'],
        'text-anchor': 'left',
        'text-offset': [2, 0],
        'text-allow-overlap': true,
        'text-ignore-placement': false,
      },
      paint: { 'icon-opacity': 0, 'text-opacity': 0 },
    })

    styleLoadedRef.current = true

    // Give the canvas container its own stacking context so it sits below markers
    // (which MapLibre places outside this container at z-index 1–9), letting the
    // color overlay blend with the canvas without affecting the HTML markers.
    const cc = map.getCanvasContainer()
    cc.style.zIndex = '0'
    setCanvasContainer(cc)

    applyLayerSettings(map)
  }

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !styleLoadedRef.current) return
    applyLayerSettings(map)
  }, [applyLayerSettings])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !canvasContainer) return // canvasContainer being set means style + ghost layer are ready
    const src = map.getSource('markers') as GeoJSONSource | undefined
    if (!src) return
    src.setData({
      type: 'FeatureCollection',
      features: geocodedLocations.map(loc => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [loc.lng!, loc.lat!] },
        properties: { name: loc.name },
      })),
    })
  }, [geocodedLocations, canvasContainer])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !canvasContainer) return
    map.setLayoutProperty('marker-collision', 'text-size', markerFontSize)
  }, [markerFontSize, canvasContainer])

  useEffect(() => {
    if (!bounds || !mapRef.current) return
    mapRef.current.fitBounds(bounds, { padding: 80 })
  }, [bounds])

  useEffect(() => {
    mapRef.current?.resize()
  }, [aspectRatio])

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
      setBounds([
        [Math.min(...successes.map(l => l.lng!)), Math.min(...successes.map(l => l.lat!))],
        [Math.max(...successes.map(l => l.lng!)), Math.max(...successes.map(l => l.lat!))],
      ])
      setHasMap(true)
    }
    setStatusMsg(`${successes.length} location${successes.length !== 1 ? 's' : ''} mapped`)
    setIsGenerating(false)
  }

  async function exportPNG() {
    const map = mapRef.current?.getMap()
    if (!map || !mapWrapperRef.current) return
    await sleep(200)

    const glCanvas = map.getCanvas()
    const glW = glCanvas.width
    const glH = glCanvas.height
    const wrapperRect = mapWrapperRef.current.getBoundingClientRect()

    // Scale output to 1080px tall, maintaining aspect ratio
    const TARGET_HEIGHT = 1080
    const exportScale = TARGET_HEIGHT / glH
    const outW = Math.round(glW * exportScale)
    const outH = TARGET_HEIGHT
    // scale converts CSS px → final export canvas px
    const scale = (glW / wrapperRect.width) * exportScale

    // Capture WebGL pixels inside the render callback — the only moment the
    // framebuffer is guaranteed readable regardless of preserveDrawingBuffer state.
    const tileDataUrl = await new Promise<string>(resolve => {
      map.once('render', () => {
        try { resolve(glCanvas.toDataURL()) } catch { resolve('') }
      })
      map.triggerRepaint()
    })

    const out = document.createElement('canvas')
    out.width = outW
    out.height = outH
    const ctx = out.getContext('2d')!

    if (tileDataUrl) {
      await new Promise<void>(resolve => {
        const img = new Image()
        img.onload = () => { ctx.drawImage(img, 0, 0, outW, outH); resolve() }
        img.onerror = () => resolve()
        img.src = tileDataUrl
      })
    }

    // Apply the same screen blend that the CSS overlay does in the browser.
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = '#88a4ae'
    ctx.fillRect(0, 0, outW, outH)
    ctx.globalCompositeOperation = 'source-over'

    // Draw HTML markers by reading their positions from the live DOM.
    for (const markerEl of map.getContainer().querySelectorAll('.maplibregl-marker')) {
      const circleEl = markerEl.querySelector('.marker-circle')
      const labelEl = markerEl.querySelector('.marker-label')
      if (!circleEl) continue
      const cr = circleEl.getBoundingClientRect()
      const cx = (cr.left + cr.width / 2 - wrapperRect.left) * scale
      const cy = (cr.top + cr.height / 2 - wrapperRect.top) * scale
      const r = (cr.width / 2) * scale

      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.2)'
      ctx.shadowBlur = 4 * scale
      ctx.shadowOffsetY = scale
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = '#f2a71b'
      ctx.fill()
      ctx.restore()

      ctx.fillStyle = '#2c1f00'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `700 ${14 * scale}px Arial, sans-serif`
      // Nudge down ~1px to compensate for textBaseline:'middle' sitting above the
      // optical center of numerals (flexbox centers on visual bounds, canvas on em midpoint).
      ctx.fillText(circleEl.textContent ?? '', cx, cy + 1 * scale)

      if (labelEl?.textContent) {
        const lx = cx + r + 8 * scale
        const lineHeight = markerFontSize * scale * 1.2
        const maxWidth = 140 * scale
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.font = `700 ${markerFontSize * scale}px Arial, sans-serif`

        // Word-wrap to match CSS max-width: 140px; white-space: normal
        const words = labelEl.textContent.split(' ')
        const lines: string[] = []
        let current = ''
        for (const word of words) {
          const test = current ? `${current} ${word}` : word
          if (current && ctx.measureText(test).width > maxWidth) {
            lines.push(current)
            current = word
          } else {
            current = test
          }
        }
        if (current) lines.push(current)

        // Vertically center the text block around cy
        const startY = cy - ((lines.length - 1) * lineHeight) / 2
        for (let li = 0; li < lines.length; li++) {
          const ly = startY + li * lineHeight
          ctx.fillStyle = 'rgba(255,255,255,0.95)'
          for (const [dx, dy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
            ctx.fillText(lines[li], lx + dx, ly + dy)
          }
          ctx.fillStyle = '#1a1a1a'
          ctx.fillText(lines[li], lx, ly)
        }
      }
    }

    const link = document.createElement('a')
    link.download = 'newsletter-map.png'
    link.href = out.toDataURL('image/png')
    link.click()
  }

  const sidebar = (
    <div className={styles.sidebarInner}>
      <h2 className={styles.title}>Newsletter Map</h2>
      <p className={styles.description}>Add locations, generate the map, then download as PNG.</p>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Aspect ratio</label>
        <select
          className={styles.select}
          value={`${aspectRatio.w}:${aspectRatio.h}`}
          onChange={e => setAspectRatio(ASPECT_RATIOS.find(r => `${r.w}:${r.h}` === e.target.value)!)}
        >
          {ASPECT_RATIOS.map(r => (
            <option key={`${r.w}:${r.h}`} value={`${r.w}:${r.h}`}>{r.label}</option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Map layers</span>
        <div className={styles.layerToggles}>
          <div className={styles.layerItem}>
            <label className={styles.layerToggle}>
              <input type="checkbox" checked={layers.background} onChange={() => toggleLayer('background')} />
              Background
            </label>
            <div className={styles.detailRow}>
              <input type="range" className={styles.detailSlider}
                min={0} max={100} step={10} value={backgroundDetail}
                disabled={!layers.background}
                onChange={e => setBackgroundDetail(Number(e.target.value))}
              />
              <span className={styles.detailValue}>{backgroundDetail}%</span>
            </div>
          </div>
          <div className={styles.layerItem}>
            <label className={styles.layerToggle}>
              <input type="checkbox" checked={layers.lines} onChange={() => toggleLayer('lines')} />
              Road lines
            </label>
            <div className={styles.detailRow}>
              <input type="range" className={styles.detailSlider}
                min={-10} max={0} step="any" value={lineDetail}
                disabled={!layers.lines}
                onChange={e => setLineDetail(Number(e.target.value))}
              />
              <span className={styles.detailValue}>{lineDetail.toFixed(1)}</span>
            </div>
          </div>
          <div className={styles.layerItem}>
            <label className={styles.layerToggle}>
              <input type="checkbox" checked={layers.labels} onChange={() => toggleLayer('labels')} />
              Labels
            </label>
            <div className={styles.detailRow}>
              <input type="range" className={styles.detailSlider}
                min={-10} max={0} step={1} value={labelDetail}
                disabled={!layers.labels}
                onChange={e => setLabelDetail(Number(e.target.value))}
              />
              <span className={styles.detailValue}>{labelDetail}</span>
            </div>
          </div>
          <div className={styles.layerItem}>
            <label className={styles.layerToggle}>
              <input type="checkbox" checked={layers.buildings} onChange={() => toggleLayer('buildings')} />
              Buildings
            </label>
          </div>
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Pin label size</label>
        <div className={styles.detailRow} style={{ paddingLeft: 0 }}>
          <input type="range" className={styles.detailSlider}
            min={10} max={24} step={1} value={markerFontSize}
            onChange={e => setMarkerFontSize(Number(e.target.value))}
          />
          <span className={styles.detailValue}>{markerFontSize}px</span>
        </div>
      </div>
      <span className={styles.fieldLabel} style={{ marginBottom: 8 }}>Pins</span>
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
    <div className={styles.mapArea} style={{ '--ar-w': aspectRatio.w, '--ar-h': aspectRatio.h } as React.CSSProperties}>
      <div className={styles.mapWrapper} ref={mapWrapperRef}>
        <Map
          ref={mapRef}
          mapStyle={tonerStyle as any}
          initialViewState={{ longitude: -98.35, latitude: 39.5, zoom: 4 }}
          onLoad={handleStyleLoad}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
        >
          {geocodedLocations.map((loc, i) => (
            <Marker key={loc.id} longitude={loc.lng!} latitude={loc.lat!} anchor="center">
              <div className="marker-wrap">
                <div className="marker-circle">{i + 1}</div>
                <div className="marker-label" style={{ fontSize: markerFontSize }}>{loc.name}</div>
              </div>
            </Marker>
          ))}
        </Map>
        {canvasContainer && createPortal(
          <div className={styles.colorOverlay} />,
          canvasContainer
        )}
      </div>
    </div>
  )

  return <WidgetLayout sidebar={sidebar} main={main} />
}
