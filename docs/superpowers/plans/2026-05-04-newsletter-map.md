# Newsletter Map Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Newsletter Map widget to Roundabout Tools that geocodes named locations and renders a styled Stamen Toner map exportable as a PNG.

**Architecture:** React widget using `WidgetLayout`. `react-leaflet` handles map rendering declaratively; a `MapController` child component uses `useMap()` to call `fitBounds` imperatively when geocoded bounds change. The `#88A4AE` screen-blend overlay is a plain CSS `position: absolute` div — hidden during export and re-applied to the canvas manually, since `html-to-image` cannot capture CSS blend modes.

**Tech Stack:** React 19, TypeScript, react-leaflet, leaflet, @types/leaflet, html-to-image, Vitest + React Testing Library, CSS Modules

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/widgets/newsletter-map/geocode.ts` | Create | `Location` type, `GeocodeCache` type, `geocode()` fn, `sleep` util |
| `src/widgets/newsletter-map/geocode.test.ts` | Create | Tests for geocode function |
| `src/widgets/newsletter-map/MapController.tsx` | Create | `useMap()` + `fitBounds` on bounds change |
| `src/widgets/newsletter-map/MapController.test.tsx` | Create | Tests for MapController |
| `src/widgets/newsletter-map/styles.module.css` | Create | All widget styles, including `:global` marker classes |
| `src/widgets/newsletter-map/index.tsx` | Create | Main widget component (built incrementally across Tasks 5–7) |
| `src/widgets/newsletter-map/index.test.tsx` | Create | Widget UI and behavior tests |
| `src/widgets.ts` | Modify | Add widget registration entry |

---

### Task 1: Install Dependencies

**Files:**
- Modifies: `package.json`, `package-lock.json`

- [ ] **Step 1: Install packages**

```bash
npm install leaflet react-leaflet html-to-image
npm install --save-dev @types/leaflet
```

Expected: 4 packages added. `package.json` updated with `leaflet`, `react-leaflet`, `html-to-image` in `dependencies` and `@types/leaflet` in `devDependencies`.

- [ ] **Step 2: Verify existing tests still pass**

```bash
npm test
```

Expected: all existing tests PASS

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add leaflet, react-leaflet, and html-to-image dependencies"
```

---

### Task 2: Geocode Function

**Files:**
- Create: `src/widgets/newsletter-map/geocode.ts`
- Create: `src/widgets/newsletter-map/geocode.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/widgets/newsletter-map/geocode.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- src/widgets/newsletter-map/geocode.test.ts
```

Expected: FAIL — `geocode` not found

- [ ] **Step 3: Create geocode.ts**

Create `src/widgets/newsletter-map/geocode.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- src/widgets/newsletter-map/geocode.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/widgets/newsletter-map/geocode.ts src/widgets/newsletter-map/geocode.test.ts
git commit -m "feat: add geocode function with Nominatim and session cache"
```

---

### Task 3: MapController Component

**Files:**
- Create: `src/widgets/newsletter-map/MapController.tsx`
- Create: `src/widgets/newsletter-map/MapController.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/widgets/newsletter-map/MapController.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- src/widgets/newsletter-map/MapController.test.tsx
```

Expected: FAIL — `MapController` not found

- [ ] **Step 3: Create MapController.tsx**

Create `src/widgets/newsletter-map/MapController.tsx`:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- src/widgets/newsletter-map/MapController.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/widgets/newsletter-map/MapController.tsx src/widgets/newsletter-map/MapController.test.tsx
git commit -m "feat: add MapController for react-leaflet fitBounds"
```

---

### Task 4: CSS Module

**Files:**
- Create: `src/widgets/newsletter-map/styles.module.css`

No tests for CSS.

- [ ] **Step 1: Create styles.module.css**

Create `src/widgets/newsletter-map/styles.module.css`:

```css
.sidebarInner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
}

.description {
  font-size: 13px;
  color: #666;
  margin: 0 0 20px;
}

.locationList {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  flex: 1;
  overflow-y: auto;
}

.locationRow {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.locationBadge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f2a71b;
  color: #2c1f00;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 6px;
}

.locationInputs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.nameInput,
.addressInput {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
  font-family: inherit;
}

.nameInput {
  font-weight: 600;
}

.nameInput:focus,
.addressInput:focus {
  border-color: #aaa;
}

.geocoded {
  background: #f0faf5 !important;
  border-color: #a8d5be !important;
  color: #2d6a4f !important;
}

.error {
  background: #fef2f2 !important;
  border-color: #fca5a5 !important;
  color: #b91c1c !important;
}

.removeBtn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  margin-top: 4px;
  flex-shrink: 0;
}

.removeBtn:hover {
  color: #555;
}

.addBtn {
  border: 1px dashed #ccc;
  background: none;
  padding: 8px;
  border-radius: 4px;
  color: #888;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.addBtn:hover {
  border-color: #aaa;
  color: #555;
}

.status {
  font-size: 12px;
  color: #666;
  margin: 0 0 8px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e5;
}

.generateBtn {
  padding: 10px 16px;
  background: #1a1a1a;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
}

.generateBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.generateBtn:hover:not(:disabled) {
  background: #333;
}

.downloadBtn {
  padding: 10px 16px;
  background: #f2a71b;
  color: #2c1f00;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
}

.downloadBtn:hover {
  background: #e09a10;
}

/* Map area */
.mapWrapper {
  position: relative;
  height: 100%;
  width: 100%;
}

.colorOverlay {
  position: absolute;
  inset: 0;
  background: #88a4ae;
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 400;
}

/*
  Marker styles are injected as raw HTML strings via L.divIcon — CSS Modules
  class name hashing doesn't apply. Must use :global() so the generated class
  names match what's in the HTML string.
*/
:global(.marker-wrap) {
  display: flex;
  align-items: center;
  gap: 8px;
}

:global(.marker-circle) {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #f2a71b;
  color: #2c1f00;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

:global(.marker-label) {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1a;
  text-shadow:
    -1px -1px 0 rgba(255, 255, 255, 0.95),
     1px -1px 0 rgba(255, 255, 255, 0.95),
    -1px  1px 0 rgba(255, 255, 255, 0.95),
     1px  1px 0 rgba(255, 255, 255, 0.95);
  max-width: 140px;
  white-space: normal;
  line-height: 1.2;
}

/* Leaflet's attribution control — Leaflet renders its own class names */
:global(.leaflet-control-attribution) {
  font-size: 9px !important;
  opacity: 0.5;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/widgets/newsletter-map/styles.module.css
git commit -m "feat: add newsletter map CSS module"
```

---

### Task 5: Widget Component — Location List

**Files:**
- Create: `src/widgets/newsletter-map/index.tsx`
- Create: `src/widgets/newsletter-map/index.test.tsx`

This task creates the widget skeleton with location list management. `generateMap` and `exportPNG` are empty stubs — implemented in Tasks 6 and 7.

- [ ] **Step 1: Write failing tests**

Create `src/widgets/newsletter-map/index.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- src/widgets/newsletter-map/index.test.tsx
```

Expected: FAIL — `NewsletterMap` not found

- [ ] **Step 3: Create index.tsx (location list skeleton)**

Create `src/widgets/newsletter-map/index.tsx`:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- src/widgets/newsletter-map/index.test.tsx
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/widgets/newsletter-map/index.tsx src/widgets/newsletter-map/index.test.tsx
git commit -m "feat: add newsletter map widget location list"
```

---

### Task 6: Map Rendering + Generate Flow

**Files:**
- Modify: `src/widgets/newsletter-map/index.tsx`
- Modify: `src/widgets/newsletter-map/index.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to the bottom of `src/widgets/newsletter-map/index.test.tsx` (after the existing `describe` block, using a new one):

```typescript
import { geocode } from './geocode'

describe('NewsletterMap — generate flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows status text and Download button after successful generate', async () => {
    vi.mocked(geocode).mockResolvedValue({ lat: 40.7128, lng: -74.006 })

    renderWidget()
    fireEvent.change(screen.getAllByPlaceholderText('Location name')[0], {
      target: { value: 'City Hall' },
    })
    fireEvent.change(screen.getAllByPlaceholderText('Address or place name')[0], {
      target: { value: 'New York, NY' },
    })
    fireEvent.click(screen.getByText('Generate Map →'))

    await screen.findByText('↓ Download PNG')
    expect(screen.getByText(/location.*mapped/i)).toBeInTheDocument()
  })

  it('shows "0 locations mapped" when all geocodes fail', async () => {
    vi.mocked(geocode).mockResolvedValue(null)

    renderWidget()
    fireEvent.change(screen.getAllByPlaceholderText('Location name')[0], {
      target: { value: 'Nowhere' },
    })
    fireEvent.change(screen.getAllByPlaceholderText('Address or place name')[0], {
      target: { value: 'xyzzy invalid address' },
    })
    fireEvent.click(screen.getByText('Generate Map →'))

    await screen.findByText('0 locations mapped')
    expect(screen.queryByText('↓ Download PNG')).toBeNull()
  })

  it('skips rows with empty name or address', async () => {
    vi.mocked(geocode).mockResolvedValue({ lat: 40.7128, lng: -74.006 })

    renderWidget()
    // Only fill the first row; rows 2 and 3 stay blank
    fireEvent.change(screen.getAllByPlaceholderText('Location name')[0], {
      target: { value: 'City Hall' },
    })
    fireEvent.change(screen.getAllByPlaceholderText('Address or place name')[0], {
      target: { value: 'New York, NY' },
    })
    fireEvent.click(screen.getByText('Generate Map →'))

    await screen.findByText('1 location mapped')
    expect(geocode).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm new tests fail**

```bash
npm test -- src/widgets/newsletter-map/index.test.tsx
```

Expected: 7 PASS, 3 FAIL (generate flow tests — `generateMap` is a stub)

- [ ] **Step 3: Update index.tsx — add imports, map rendering, and generateMap**

Replace the entire contents of `src/widgets/newsletter-map/index.tsx` with:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npm test -- src/widgets/newsletter-map/index.test.tsx
```

Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/widgets/newsletter-map/index.tsx src/widgets/newsletter-map/index.test.tsx
git commit -m "feat: add map rendering and generate map flow"
```

---

### Task 7: PNG Export

**Files:**
- Modify: `src/widgets/newsletter-map/index.tsx`
- Modify: `src/widgets/newsletter-map/index.test.tsx`

- [ ] **Step 1: Write failing test**

Add to the bottom of `src/widgets/newsletter-map/index.test.tsx` (new `describe` block). `mockToCanvas` is already declared at the top of the file via `vi.hoisted` — no new mock setup needed:

```typescript
describe('NewsletterMap — PNG export', () => {
  it('triggers a PNG file download when Download PNG is clicked', async () => {
    vi.mocked(geocode).mockResolvedValue({ lat: 40.7128, lng: -74.006 })

    const mockCtx = {
      globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
      fillStyle: '',
      fillRect: vi.fn(),
    }
    const mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,abc'),
    }
    mockToCanvas.mockResolvedValue(mockCanvas)

    const mockClick = vi.fn()
    const mockLink = { download: '', href: '', click: mockClick }
    vi.spyOn(document, 'createElement').mockImplementationOnce(
      () => mockLink as unknown as HTMLElement
    )

    renderWidget()
    fireEvent.change(screen.getAllByPlaceholderText('Location name')[0], {
      target: { value: 'City Hall' },
    })
    fireEvent.change(screen.getAllByPlaceholderText('Address or place name')[0], {
      target: { value: 'New York, NY' },
    })
    fireEvent.click(screen.getByText('Generate Map →'))

    const downloadBtn = await screen.findByText('↓ Download PNG')
    fireEvent.click(downloadBtn)

    await vi.waitFor(() => expect(mockClick).toHaveBeenCalled())
    expect(mockLink.download).toBe('newsletter-map.png')
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/widgets/newsletter-map/index.test.tsx
```

Expected: 10 PASS, 1 FAIL (export test — `exportPNG` is a stub)

- [ ] **Step 3: Implement exportPNG in index.tsx**

Replace the stub `async function exportPNG() {}` in `src/widgets/newsletter-map/index.tsx` with:

```typescript
async function exportPNG() {
  if (!mapWrapperRef.current) return
  setOverlayVisible(false)
  await sleep(500)

  const { toCanvas } = await import('html-to-image')
  const canvas = await toCanvas(mapWrapperRef.current, { pixelRatio: 2 })

  const ctx = canvas.getContext('2d')!
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = '#88A4AE'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'source-over'

  const link = document.createElement('a')
  link.download = 'newsletter-map.png'
  link.href = canvas.toDataURL('image/png')
  link.click()

  setOverlayVisible(true)
}
```

- [ ] **Step 4: Run all tests to confirm they pass**

```bash
npm test -- src/widgets/newsletter-map/index.test.tsx
```

Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/widgets/newsletter-map/index.tsx src/widgets/newsletter-map/index.test.tsx
git commit -m "feat: implement PNG export with html-to-image and canvas screen blend"
```

---

### Task 8: Register Widget

**Files:**
- Modify: `src/widgets.ts`

- [ ] **Step 1: Add widget to the registry**

Replace the contents of `src/widgets.ts` with:

```typescript
import { lazy } from 'react'
import type { LazyExoticComponent, FC } from 'react'

export interface Widget {
  name: string
  description: string
  path: string
  component: LazyExoticComponent<FC>
}

export const widgets: Widget[] = [
  {
    name: 'Newsletter Map',
    description: 'Generate a styled map graphic for newsletters',
    path: '/newsletter-map',
    component: lazy(() => import('./widgets/newsletter-map')),
  },
]
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests PASS — including `src/widgets.test.ts` which validates registry shape

- [ ] **Step 3: Commit**

```bash
git add src/widgets.ts
git commit -m "feat: register newsletter map widget"
```
