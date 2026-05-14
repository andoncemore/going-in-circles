# Roundabout Logo Generator — Design

## Overview

A new widget that generates a two-part logo: a fixed "ROUNDABOUT" SVG header on top and a dynamic location name below it. The location name scales so its **ink width** (visible glyph bounds, excluding sidebearings) exactly matches the configured logo width. The tool offers a live preview and exports SVG (with text converted to outlines) and PNG (transparent background).

The widget mounts at `/logo` and is the first entry in the home gallery, ahead of Newsletter Map.

## Goals

- Pixel-accurate text scaling so glyph ink width equals logo width at any configured size.
- Self-contained SVG export — no font dependency on the viewer's system.
- Transparent-background PNG export.
- Live preview that updates as the user types or changes width.
- Single source of truth: the same SVG drives the preview, the SVG export, and the PNG export.

## Non-goals

- Multiple lines of text. The location name is always a single line.
- Complex shaping, ligatures, or non-Latin scripts. Santa Ana is a Latin-only display face used in uppercase.
- Server-side rendering or rate-limited generation. Everything runs in the browser.
- Configurable colors, fonts, or alternate top graphics. The header art and color (`#66381E`) are fixed.

## File layout

```
src/widgets/logo/
  index.tsx              # Widget component (sidebar + preview, wires up controls + exports)
  layout.ts              # Pure: computeLayout(font, text, width) → svg dims + path data
  layout.test.ts         # Math tests using the real Santa Ana font
  roundabout-path.ts     # const: SVG path "d" string + native dims (320 × 42)
  roundabout.svg         # Original source SVG kept for reference (not loaded at runtime)
  font.ts                # loadFont() — caches the parsed opentype.Font module-level
  export.ts              # serializeSvg(), rasterizeToPng()
  styles.module.css
  index.test.tsx         # Smoke + integration tests
public/fonts/
  SantaAna-SemiBold.{otf|ttf}   # The actual font binary, served as a static asset
```

Registry: a new entry is inserted at the **top** of the `widgets` array in `src/widgets.ts` so `/logo` shows first.

## Dependencies

Add one runtime dependency:

- `opentype.js` — reads the font binary, returns glyph metrics and an SVG `path d` string for any text/size.

No other new dependencies. PNG export uses native canvas APIs.

## Layout math

The math lives in `layout.ts` as a single pure function. Given a parsed `opentype.Font`, the (already-uppercased) text, and the target width, it returns everything needed to render the SVG.

```ts
type Layout =
  | {
      width: number          // SVG viewBox width = target width
      height: number         // SVG viewBox height
      topPathD: string       // The ROUNDABOUT path's d-attribute
      topTransform: string   // e.g. "scale(2)" — scales the 320×42 native art to target width
      textPathD: string | null  // Outlined location text, positioned. null if text empty.
    }
```

### Algorithm

1. **Top section.** `topH = width * (42 / 320)`. `topTransform = scale(width / 320)`.
2. **Gap.** `gap = width * (15 / 320)`.
3. **Text measurement at reference size 100.**
   - `refPath = font.getPath(text, 0, 0, 100)`
   - `{ x1, y1, x2, y2 } = refPath.getBoundingBox()` (ink bounds; `y1` is above the baseline and negative, `y2` is below and positive)
   - `inkW = x2 − x1`
   - `inkLeft = x1`
   - `ascent = −y1`
   - `descent = y2`
4. **Scale.** `s = width / inkW`. Final font size `fs = 100 * s`.
5. **Final path.** Re-generate the path at `fs`, translated so the left ink edge lands on `x = 0` and the baseline sits at `topH + gap + ascent * s`:
   - `font.getPath(text, −inkLeft * s, topH + gap + ascent * s, fs).toPathData()`
6. **Total SVG height.** `height = topH + gap + (ascent + descent) * s`.

### Empty text

`computeLayout` short-circuits and returns `{ width, height: topH, topPathD, topTransform, textPathD: null }`. The preview shows only the top section; export buttons are disabled.

### Why this is robust

- `getBoundingBox()` gives ink bounds, not advance-width bounds, so sidebearings don't pollute the scale.
- Measuring at `fontSize = 100` and scaling linearly avoids precision issues at very small or very large target sizes.
- The same `font.getPath` call drives ink-width measurement and outline export, so what you measure is what you draw.

## UI

`WidgetLayout` shell, same pattern as Newsletter Map.

### Sidebar

- **Location name** — single-line text input. Auto-uppercased in JS (`value.toUpperCase()`) before being committed to state, so the exported file matches the preview byte-for-byte. Placeholder: e.g. "BROOKLYN".
- **Width** — number input. Default `320`. Soft min `100`, soft max `2000`. Below `100`, the value is clamped to `100` on blur with a small inline note.
- **Download SVG** button — disabled when text is empty or font isn't loaded.
- **Download PNG** button — same disable rule.
- **Status line** — shows `Loading font…`, `Font failed to load: <message>`, or nothing once ready.

### Main panel

A live inline `<svg>` element with `width={layout.width}` and `height={layout.height}`, centered. A `max-width: 100%` on the SVG keeps very wide logos from overflowing visually while still exporting at the requested size. The SVG contains two paths (top + text), both filled `#66381E`.

## Font loading

`font.ts` exports `loadFont(): Promise<opentype.Font>`. It calls `opentype.load()` with the path of whichever font file we ship (`/fonts/SantaAna-SemiBold.otf` or `.ttf`) and caches the resolved `Font` instance module-level. The widget uses a small hook:

```ts
function useFont() {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error', font?: opentype.Font, error?: string }>({ status: 'loading' })
  useEffect(() => {
    loadFont().then(font => setState({ status: 'ready', font })).catch(e => setState({ status: 'error', error: String(e) }))
  }, [])
  return state
}
```

The widget renders the preview only when `status === 'ready'`. While loading, the main panel shows a thin "Loading font…" line.

## Export

Both exports operate on the same serialized SVG string.

### SVG export — `export.ts: serializeSvg(svgEl)`

1. Clone the live SVG node.
2. Ensure `xmlns="http://www.w3.org/2000/svg"` is set.
3. Serialize with `XMLSerializer`.
4. Wrap in a `Blob` of type `image/svg+xml;charset=utf-8`, create an object URL, trigger download as `roundabout-<slug>.svg` (where `slug` is the lowercased, dash-separated location name; falls back to `roundabout.svg` if text is empty — though export is disabled in that state anyway).

Because `textPathD` is an outline path, no fonts are referenced; the SVG renders identically on any viewer.

### PNG export — `export.ts: rasterizeToPng(svgString, width, height)`

1. Base64-encode the SVG string: `'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))`.
2. Load it into an `Image`, await `onload`.
3. Create an offscreen `<canvas>` sized to the SVG's `width` × `height`. Do not fill — leave it transparent.
4. `ctx.drawImage(img, 0, 0)`.
5. `canvas.toBlob('image/png')` → trigger download as `roundabout-<slug>.png`.

No additional libraries needed. The canvas defaults to transparent, satisfying the "no white fill" requirement.

## Error handling

| Condition | Behavior |
|---|---|
| Font fails to load | Status line shows the error; export buttons stay disabled; preview shows only the top section (which doesn't need the font). |
| Empty text | Export buttons disabled; preview shows top section only. |
| Width below `100` | Clamped to `100` on blur with a small inline note. |
| `canvas.toBlob` returns `null` (extremely rare) | Surface a one-line error in the status area; preview unaffected. |

No try/catch outside the font-load promise. The layout math is deterministic and operates on validated inputs (font loaded + non-empty text + width ≥ 100), so no internal error handling is warranted.

## Testing

`layout.test.ts` (the math is the load-bearing piece):

- Load the actual Santa Ana font from `public/fonts/` via `node:fs` and `opentype.parse`.
- For a handful of strings (`"LA"`, `"BROOKLYN"`, `"SAN FRANCISCO"`) at several widths (`200`, `320`, `800`):
  - Assert that re-measuring the returned `textPathD`'s bounding box gives `inkW` within ±0.5 px of the target width.
  - Assert that the left edge of the text path's bbox is within ±0.5 px of `0`.
  - Assert that `height` equals `topH + gap + (ascent + descent) * s` (sanity).
- For empty text, assert `textPathD === null` and `height === topH`.

`index.test.tsx`:

- Renders with inputs and disabled export buttons.
- After typing a value (and after the font load promise resolves in the test), the export buttons enable.
- The preview SVG contains exactly two `<path>` elements once text is non-empty (no `<text>`).

No tests are needed for the export helpers themselves — they are thin wrappers around standard browser APIs.

## Registry change

`src/widgets.ts` gains an entry at index 0:

```ts
export const widgets: Widget[] = [
  {
    name: 'Roundabout Logo Generator',
    description: 'Generate the Roundabout location logo as SVG or PNG',
    path: '/logo',
    component: lazy(() => import('./widgets/logo')),
  },
  // ...existing Newsletter Map entry
]
```

## Open items resolved during design

- **Assets**: User will provide both the ROUNDABOUT SVG and an OTF/TTF of Santa Ana SemiBold (the original WOFF2 isn't readable by opentype.js).
- **Font library**: opentype.js (one tool for both measurement and outline conversion).
- **Auto-uppercase**: applied to the text string in JS before measurement and rendering, not via CSS, so export matches preview exactly.
- **PNG pipeline**: SVG → data URL → `<img>` → canvas → PNG, keeping a single source of truth.
- **Naming / placement**: "Roundabout Logo Generator" at `/logo`, first in the home gallery.
