# Newsletter Map Generator — Design Spec

## Overview

A widget within the Roundabout Tools project that lets a user input up to 10 named locations, geocodes them automatically, and renders a styled map graphic exportable as a PNG for use in newsletters. Built as a React widget following existing project conventions.

---

## Functional Requirements

- User enters up to 10 locations, each with a **name** and an **address or place name**
- App geocodes each address on "Generate Map" click
- Map auto-fits to show all pinned locations with padding
- Each location gets an amber numbered circle marker with the name as a floating label to the right
- User can download the result as a PNG
- Geocode results are cached in-session (useRef) so re-generating doesn't re-hit the API
- Min 1 row (no remove button when only 1), max 10 rows

---

## Visual Design

### Map Style
- **Base tiles:** Stamen Toner via Stadia Maps — `https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png`
- **Color overlay:** `position: absolute; inset: 0; background: #88A4AE; mix-blend-mode: screen; pointer-events: none; z-index: 400` — tints roads to steel-blue while leaving white areas clean. Sits outside `<MapContainer>` but inside the map wrapper div.

### Markers
- Filled amber circle, 30px diameter, no stroke
- Fill: `#F2A71B`, number color: `#2C1F00` (dark brown), 12px bold
- Drop shadow: `box-shadow: 0 1px 4px rgba(0,0,0,0.2)`
- Implemented as `L.divIcon` with `className: ''`, `iconAnchor: [15, 15]`, `iconSize: [1, 1]`

### Labels
- Positioned right of circle via flexbox (`display: flex; align-items: center; gap: 8px`)
- Font: bold, **14px**, `#1a1a1a`
- Text halo: white `text-shadow` on all 4 diagonal offsets (`rgba(255,255,255,0.95)`)
- `max-width: 140px; white-space: normal; line-height: 1.2` — wraps to two lines if needed
- No background pill — floats directly on the map

### Map Container
- Fills the `main` slot of `WidgetLayout` — wide landscape crop
- `zoomControl: false`, attribution at `font-size: 9px; opacity: 0.5`

---

## Tech Stack

Additions to existing project:

| Package | Purpose |
|---|---|
| `leaflet` | Map engine |
| `react-leaflet` | React bindings for Leaflet |
| `@types/leaflet` | TypeScript types |
| `html-to-image` | PNG export (ships own types) |

---

## File Structure

```
src/widgets/newsletter-map/
  index.tsx           # Main widget component
  MapController.tsx   # Inner component: useMap() + fitBounds
  styles.module.css   # All styles
```

Registration in `src/widgets.ts`:
```ts
{
  name: 'Newsletter Map',
  description: 'Generate a styled map graphic for newsletters',
  path: '/newsletter-map',
  component: lazy(() => import('./widgets/newsletter-map')),
}
```

---

## Component Architecture

### `index.tsx`

The main widget. Uses `WidgetLayout` with:
- **`sidebar`** — location input list, Generate button, Download button
- **`main`** — map wrapper div (ref target) containing `<MapContainer>` and the color overlay div

### `MapController.tsx`

Tiny component rendered inside `<MapContainer>`. Calls `useMap()` (only valid inside MapContainer children) and runs a `useEffect` to call `map.fitBounds(bounds, { padding: [80, 80] })` when the `bounds` prop changes. For a single location, falls back to `map.setView([lat, lng], 14)`.

```tsx
function MapController({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [80, 80] })
  }, [bounds, map])
  return null
}
```

---

## State Model

```typescript
interface Location {
  id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  error: boolean
}
```

Hooks in `index.tsx`:

| Hook | Purpose |
|---|---|
| `useState<Location[]>` | Location list, initialized with 3 blank rows |
| `useState<LatLngBounds \| null>` | Computed bounds after geocoding; passed to MapController |
| `useState<boolean>` isGenerating | Disables Generate button during geocoding |
| `useState<boolean>` hasMap | Shows Download button after first successful generate |
| `useState<boolean>` overlayVisible | Hides overlay during PNG export |
| `useRef<Record<string, {lat,lng}>>` | In-session geocode cache — no re-render on write |
| `useRef<HTMLDivElement>` | Map wrapper div — target for html-to-image export |

---

## Geocoding

**Provider:** Nominatim (OpenStreetMap) — free, no API key required.

```
GET https://nominatim.openstreetmap.org/search?format=json&limit=1&q={address}
Headers: Accept-Language: en
```

`geocode(address, cache)` — standalone async function:
- Checks cache ref; returns cached result if present
- Fetches Nominatim, parses first result
- Stores in cache, returns `{ lat, lng }` or `null`

`generateMap()` — async button handler:
- Sets `isGenerating = true`
- Filters to locations with both `name` and `address` filled
- Loops through; skips already-geocoded entries; calls `geocode()` for the rest with 300ms sleep between requests
- Updates each location's `lat/lng` or sets `error: true` via `setLocations`
- Computes `LatLngBounds` from all successfully geocoded points, sets on state
- Sets `hasMap = true`, `isGenerating = false`

---

## Map Rendering

Leaflet's own CSS must be imported at the top of `index.tsx`:
```ts
import 'leaflet/dist/leaflet.css'
```

```tsx
<MapContainer center={[39.5, -98.35]} zoom={4} zoomControl={false}>
  <TileLayer
    url="https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png"
    attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://stamen.com/">Stamen Design</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  />
  {geocodedLocations.map((loc, i) => (
    <Marker key={loc.id} position={[loc.lat!, loc.lng!]} icon={createMarkerIcon(loc.name, i + 1)} />
  ))}
  <MapController bounds={bounds} />
</MapContainer>
```

`createMarkerIcon(name, number)` — standalone function returning an `L.divIcon`:

```tsx
L.divIcon({
  className: '',
  html: `<div class="marker-wrap">
    <div class="marker-circle">${number}</div>
    <div class="marker-label">${name}</div>
  </div>`,
  iconAnchor: [15, 15],
  iconSize: [1, 1],
})
```

---

## PNG Export

`exportPNG()` — async button handler:

1. Set `overlayVisible = false`
2. `await sleep(500)` — let tiles settle without overlay
3. `const { toCanvas } = await import('html-to-image')` — dynamic import, not in initial bundle
4. `const canvas = await toCanvas(mapWrapperRef.current!, { pixelRatio: 2 })`
5. Re-apply screen blend: `ctx.globalCompositeOperation = 'screen'`, fill `#88A4AE`, reset to `'source-over'`
6. `canvas.toDataURL('image/png')` → trigger download as `newsletter-map.png`
7. Set `overlayVisible = true`

---

## Input UX

- Each row: amber numbered badge + name input (bold placeholder) + address input (muted placeholder) + × remove button
- Address input state classes:
  - `.geocoded` — `#f0faf5` bg, `#a8d5be` border, `#2d6a4f` text
  - `.error` — `#fef2f2` bg, `#fca5a5` border, `#b91c1c` text
- "+ Add location" dashed button below rows when count < 10
- Status text below list shows geocoding progress ("Geocoding 3/5…") and final result count

---

## CSS Modules + divIcon

The marker HTML is injected as a plain string via `L.divIcon({ html: ... })`, so CSS Modules class name hashing doesn't apply. Marker classes (`.marker-wrap`, `.marker-circle`, `.marker-label`) must be declared with `:global()` wrappers inside `styles.module.css`:

```css
:global(.marker-wrap) { display: flex; align-items: center; gap: 8px; }
:global(.marker-circle) { width: 30px; height: 30px; ... }
:global(.marker-label) { font-size: 14px; ... }
```

All other styles (layout, sidebar, inputs) use normal CSS Module scoped classes.

---

## Stadia Maps / Tiles

No API key required for localhost. For the deployed Netlify URL:
- Sign up free at stadiamaps.com
- Add the Netlify domain under Authentication Configuration in the Stadia dashboard
- Domain-based auth requires no code change
