# Roundabout Logo Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/logo` widget that generates a two-part logo (fixed "ROUNDABOUT" SVG header + dynamic location name scaled to fit the same width), with live preview and SVG/PNG export.

**Architecture:** A single React component renders one inline SVG that is the source of truth for the preview, the SVG export, and the PNG export. A pure `computeLayout` function turns `(font, text, width)` into final SVG dimensions plus path data using opentype.js's `font.getPath().getBoundingBox()` to measure glyph ink width. PNG export rasterizes the same SVG via a data URL → `<img>` → canvas → `toBlob`.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest + React Testing Library, opentype.js (new dependency).

**Spec:** `docs/superpowers/specs/2026-05-14-roundabout-logo-generator-design.md`

---

## File map

```
src/widgets/logo/
  index.tsx              # Widget component (Task 7, 8, 9, 10, 11)
  layout.ts              # Pure layout math (Task 4)
  layout.test.ts         # Layout math tests (Task 4)
  roundabout-path.ts     # SVG path constant + native dims (Task 2)
  roundabout-path.test.ts # Sanity check on the constant (Task 2)
  roundabout.svg         # Source file (provided by user; Task 1)
  font.ts                # loadFont() + useFont() hook (Task 3)
  export.ts              # serializeSvg(), rasterizeToPng() (Task 5)
  styles.module.css      # Sidebar + main panel styling (Task 7)
  index.test.tsx         # Component smoke tests (Task 12)
src/widgets.ts           # Add the new widget at index 0 (Task 13)
public/fonts/SantaAna-SemiBold.{otf|ttf}  # User-provided binary (Task 1)
package.json             # Add opentype.js dependency (Task 1)
```

---

## Task 1: Verify assets, install dependency

**Files:**
- Verify: `src/widgets/logo/roundabout.svg` (user-provided)
- Verify: `public/fonts/SantaAna-SemiBold.otf` or `.ttf` (user-provided)
- Modify: `package.json` (add opentype.js)

- [ ] **Step 1: Verify the source SVG is in place**

Run: `ls -la src/widgets/logo/roundabout.svg`

Expected: file exists. If missing, **STOP** and ask the user to drop the ROUNDABOUT SVG at this path.

- [ ] **Step 2: Inspect the SVG to extract path data**

Read `src/widgets/logo/roundabout.svg`. Find the `<svg>` root element's `viewBox` (or `width`/`height`) attributes — they should be `0 0 320 42` (or equivalent 320 × 42 natively). Note the `d="..."` attribute(s) of the `<path>` element(s). If there are multiple paths, concatenate the `d` values into one string with spaces between them (a multi-`M` path is valid SVG).

If the native dimensions differ from 320 × 42, flag it: the spec hardcodes those numbers, and changing them means updating the spec, this plan, and `roundabout-path.ts`. Stop and confirm with the user before continuing.

- [ ] **Step 3: Verify the font is in place**

Run: `ls -la public/fonts/SantaAna-SemiBold.*`

Expected: exactly one match, with extension `.otf` or `.ttf`. If missing, **STOP** and ask the user. If WOFF/WOFF2, **STOP** — opentype.js can't read WOFF2 (the spec covers this).

Note the filename including extension; you'll wire it into `font.ts` in Task 3.

- [ ] **Step 4: Install opentype.js**

Run: `npm install opentype.js && npm install -D @types/opentype.js`

Expected: no errors. Verify both appear in `package.json`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/widgets/logo/roundabout.svg
git commit -m "feat: scaffold logo widget — add opentype.js and source SVG"
```

---

## Task 2: Create the ROUNDABOUT path constant

**Files:**
- Create: `src/widgets/logo/roundabout-path.ts`
- Create: `src/widgets/logo/roundabout-path.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/widgets/logo/roundabout-path.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ROUNDABOUT_PATH, ROUNDABOUT_NATIVE_WIDTH, ROUNDABOUT_NATIVE_HEIGHT } from './roundabout-path'

describe('roundabout path constant', () => {
  it('exports native dimensions of 320 × 42', () => {
    expect(ROUNDABOUT_NATIVE_WIDTH).toBe(320)
    expect(ROUNDABOUT_NATIVE_HEIGHT).toBe(42)
  })

  it('exports a non-empty path d string starting with a move command', () => {
    expect(typeof ROUNDABOUT_PATH).toBe('string')
    expect(ROUNDABOUT_PATH.length).toBeGreaterThan(100)
    expect(ROUNDABOUT_PATH.trim()[0]).toMatch(/[Mm]/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- roundabout-path`

Expected: FAIL with "Cannot find module './roundabout-path'".

- [ ] **Step 3: Implement the constant**

Create `src/widgets/logo/roundabout-path.ts` by pasting the `d` value extracted in Task 1, Step 2:

```ts
export const ROUNDABOUT_NATIVE_WIDTH = 320
export const ROUNDABOUT_NATIVE_HEIGHT = 42
export const ROUNDABOUT_PATH = `<paste-the-d-attribute-value-here>`
```

Replace `<paste-the-d-attribute-value-here>` with the actual path string. Use a template literal (backticks) so embedded quotes don't need escaping.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- roundabout-path`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/logo/roundabout-path.ts src/widgets/logo/roundabout-path.test.ts
git commit -m "feat: extract roundabout svg path data to a typescript constant"
```

---

## Task 3: Font loader and hook

**Files:**
- Create: `src/widgets/logo/font.ts`

No unit tests — this module is a thin wrapper around `opentype.load` and is exercised by the component smoke tests.

- [ ] **Step 1: Write the module**

Create `src/widgets/logo/font.ts`. Use the actual font filename from Task 1, Step 3 in `FONT_PATH`:

```ts
import { useEffect, useState } from 'react'
import opentype, { type Font } from 'opentype.js'

export const FONT_PATH = '/fonts/SantaAna-SemiBold.otf'

let cached: Promise<Font> | null = null

export function loadFont(): Promise<Font> {
  if (!cached) cached = opentype.load(FONT_PATH)
  return cached
}

export type FontState =
  | { status: 'loading' }
  | { status: 'ready', font: Font }
  | { status: 'error', error: string }

export function useFont(): FontState {
  const [state, setState] = useState<FontState>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    loadFont()
      .then(font => { if (!cancelled) setState({ status: 'ready', font }) })
      .catch(e => { if (!cancelled) setState({ status: 'error', error: String(e?.message ?? e) }) })
    return () => { cancelled = true }
  }, [])
  return state
}
```

If the font you have is `.ttf`, change `FONT_PATH` accordingly.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit`

Expected: no errors. If `@types/opentype.js` is missing types for some symbol, fall back to `import opentype from 'opentype.js'` and reference types via `opentype.Font` qualified.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/logo/font.ts
git commit -m "feat: add font loader and useFont hook for logo widget"
```

---

## Task 4: Layout math (the core)

**Files:**
- Create: `src/widgets/logo/layout.ts`
- Create: `src/widgets/logo/layout.test.ts`

This task TDDs `computeLayout(font, text, width)` through four cases: empty text, ink width matching target, left-edge alignment, and height formula.

- [ ] **Step 1: Write the first failing test (empty text)**

Create `src/widgets/logo/layout.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import opentype, { type Font } from 'opentype.js'
import { FONT_PATH } from './font'
import { computeLayout } from './layout'

let font: Font

beforeAll(() => {
  // FONT_PATH is "/fonts/SantaAna-SemiBold.otf" (browser URL); on disk it lives under public/.
  const onDisk = resolve(__dirname, '../../../public', FONT_PATH.replace(/^\//, ''))
  const buf = readFileSync(onDisk)
  font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
})

describe('computeLayout — empty text', () => {
  it('returns top-only layout (no textPathD) when text is empty', () => {
    const layout = computeLayout(font, '', 320)
    expect(layout.width).toBe(320)
    expect(layout.textPathD).toBeNull()
    // topH at width=320 is exactly 42 (native)
    expect(layout.height).toBeCloseTo(42, 5)
    expect(layout.topTransform).toBe('scale(1)')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- layout`

Expected: FAIL with "Cannot find module './layout'".

- [ ] **Step 3: Implement empty-text branch**

Create `src/widgets/logo/layout.ts`:

```ts
import type { Font } from 'opentype.js'
import { ROUNDABOUT_NATIVE_WIDTH, ROUNDABOUT_NATIVE_HEIGHT } from './roundabout-path'

export interface Layout {
  width: number
  height: number
  topTransform: string
  textPathD: string | null
}

const NATIVE_GAP = 15

export function computeLayout(font: Font, text: string, width: number): Layout {
  const topScale = width / ROUNDABOUT_NATIVE_WIDTH
  const topH = ROUNDABOUT_NATIVE_HEIGHT * topScale
  const topTransform = `scale(${topScale})`

  if (text.length === 0) {
    return { width, height: topH, topTransform, textPathD: null }
  }

  // Filled in by next steps
  return { width, height: topH, topTransform, textPathD: null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- layout`

Expected: PASS, 1 test.

- [ ] **Step 5: Write the next failing test (ink width and left alignment)**

Append to `src/widgets/logo/layout.test.ts`:

```ts
describe('computeLayout — non-empty text', () => {
  // Re-parse the rendered path to get its actual ink bounding box.
  function inkBox(font: Font, d: string) {
    // opentype.js exposes parser internals via Path objects; the easiest cross-version way
    // to get the rendered path's bbox is to re-build it from the d string is non-trivial,
    // so we instead trust opentype's own getPath result by recomputing it inside the helper.
    return null as never
  }

  it('scales font size so glyph ink width equals target width', () => {
    const layout = computeLayout(font, 'BROOKLYN', 320)
    expect(layout.textPathD).not.toBeNull()

    // Reconstruct the path by re-running getPath at the same final size and verifying ink width.
    // We expose the chosen font size via the layout so tests can verify the math directly.
    expect(layout.fontSize).toBeDefined()
    const p = font.getPath('BROOKLYN', layout.textOriginX!, layout.textOriginY!, layout.fontSize!)
    const bb = p.getBoundingBox()
    expect(bb.x2 - bb.x1).toBeCloseTo(320, 1)
  })

  it('positions text so the left ink edge sits at x = 0', () => {
    const layout = computeLayout(font, 'BROOKLYN', 320)
    const p = font.getPath('BROOKLYN', layout.textOriginX!, layout.textOriginY!, layout.fontSize!)
    const bb = p.getBoundingBox()
    expect(bb.x1).toBeCloseTo(0, 1)
  })

  it('scales linearly: doubling width doubles font size', () => {
    const a = computeLayout(font, 'BROOKLYN', 320)
    const b = computeLayout(font, 'BROOKLYN', 640)
    expect(b.fontSize!).toBeCloseTo(a.fontSize! * 2, 1)
  })

  it('height = topH + gap + (ascent + descent) * scale', () => {
    const layout = computeLayout(font, 'BROOKLYN', 320)
    // topH at 320 is 42; gap at 320 is 15
    const ref = font.getPath('BROOKLYN', 0, 0, 100)
    const bb = ref.getBoundingBox()
    const inkW = bb.x2 - bb.x1
    const s = 320 / inkW
    const expectedHeight = 42 + 15 + (-bb.y1 + bb.y2) * s
    expect(layout.height).toBeCloseTo(expectedHeight, 2)
  })
})
```

These tests reference three fields not yet on `Layout` — `fontSize`, `textOriginX`, `textOriginY`. We add them in the next step so tests can verify the math directly without re-deriving it from `textPathD`.

- [ ] **Step 6: Run tests to verify they fail**

Run: `npm test -- layout`

Expected: FAIL — type errors on `layout.fontSize`, `layout.textOriginX`, `layout.textOriginY`, and the empty `textPathD` for non-empty text.

- [ ] **Step 7: Implement the full math**

Replace the body of `src/widgets/logo/layout.ts`:

```ts
import type { Font } from 'opentype.js'
import { ROUNDABOUT_NATIVE_WIDTH, ROUNDABOUT_NATIVE_HEIGHT } from './roundabout-path'

export interface Layout {
  width: number
  height: number
  topTransform: string
  textPathD: string | null
  fontSize: number | null
  textOriginX: number | null
  textOriginY: number | null
}

const NATIVE_GAP = 15
const REF_FONT_SIZE = 100

export function computeLayout(font: Font, text: string, width: number): Layout {
  const topScale = width / ROUNDABOUT_NATIVE_WIDTH
  const topH = ROUNDABOUT_NATIVE_HEIGHT * topScale
  const gap = NATIVE_GAP * topScale
  const topTransform = `scale(${topScale})`

  if (text.length === 0) {
    return { width, height: topH, topTransform, textPathD: null, fontSize: null, textOriginX: null, textOriginY: null }
  }

  const refPath = font.getPath(text, 0, 0, REF_FONT_SIZE)
  const bb = refPath.getBoundingBox()
  const inkW = bb.x2 - bb.x1
  const inkLeft = bb.x1
  const ascent = -bb.y1
  const descent = bb.y2

  const s = width / inkW
  const fontSize = REF_FONT_SIZE * s
  const textOriginX = -inkLeft * s
  const textOriginY = topH + gap + ascent * s
  const height = topH + gap + (ascent + descent) * s

  const textPathD = font.getPath(text, textOriginX, textOriginY, fontSize).toPathData(2)

  return { width, height, topTransform, textPathD, fontSize, textOriginX, textOriginY }
}
```

`toPathData(2)` rounds path coordinates to 2 decimal places — small enough that visual fidelity is preserved, large enough to keep the SVG output compact.

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- layout`

Expected: PASS, 5 tests.

- [ ] **Step 9: Commit**

```bash
git add src/widgets/logo/layout.ts src/widgets/logo/layout.test.ts
git commit -m "feat: implement pure layout math for logo widget with opentype.js"
```

---

## Task 5: Export helpers

**Files:**
- Create: `src/widgets/logo/export.ts`

No unit tests — these functions are thin wrappers around `XMLSerializer` and canvas APIs. Coverage comes from the component smoke tests in Task 12 and manual browser verification in Task 14.

- [ ] **Step 1: Write the module**

Create `src/widgets/logo/export.ts`:

```ts
export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  return new XMLSerializer().serializeToString(clone)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function rasterizeToPng(svgString: string, width: number, height: number): Promise<Blob> {
  // btoa() requires Latin-1; encodeURIComponent + unescape converts UTF-8 to a Latin-1-safe string.
  const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load SVG into Image'))
    img.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width)
  canvas.height = Math.ceil(height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D canvas context')

  // No fill — leave canvas transparent.
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob returned null')), 'image/png')
  })
}

export function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'roundabout'
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/logo/export.ts
git commit -m "feat: add svg serialization and png rasterization helpers"
```

---

## Task 6: Widget styles

**Files:**
- Create: `src/widgets/logo/styles.module.css`

- [ ] **Step 1: Write the styles**

Create `src/widgets/logo/styles.module.css`. Mirror the field/label/input patterns used by `src/widgets/newsletter-map/styles.module.css` so the two widgets feel cohesive. Use simple, neutral styling — the main panel needs to center the SVG and constrain it visually.

```css
.sidebarInner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.title { font-size: 22px; font-weight: 700; margin: 0; }
.description { color: #555; margin: 0 0 8px 0; }

.field { display: flex; flex-direction: column; gap: 6px; }
.fieldLabel { font-size: 13px; font-weight: 600; color: #333; }

.input {
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font: inherit;
}
.input:focus { outline: 2px solid #66381e; outline-offset: -1px; }

.status { font-size: 13px; color: #555; margin: 0; }
.statusError { font-size: 13px; color: #b3261e; margin: 0; }

.actions { display: flex; gap: 8px; margin-top: 8px; }

.button {
  padding: 10px 14px;
  border: 0;
  border-radius: 6px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.primary { background: #66381e; color: white; }
.primary:disabled { background: #ccc; cursor: not-allowed; }
.secondary { background: #eee; color: #333; }
.secondary:disabled { color: #999; cursor: not-allowed; }

.previewWrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 32px;
  box-sizing: border-box;
}

.previewSvg {
  max-width: 100%;
  height: auto;
  display: block;
}

.placeholder {
  color: #999;
  font-size: 14px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/widgets/logo/styles.module.css
git commit -m "feat: add logo widget styles"
```

---

## Task 7: Widget scaffold — sidebar UI, no preview yet

**Files:**
- Create: `src/widgets/logo/index.tsx`

Builds the controlled inputs and disabled action buttons. The main panel shows the loading state or a placeholder. No preview or downloads wired yet.

- [ ] **Step 1: Write the component**

Create `src/widgets/logo/index.tsx`:

```tsx
import { useState } from 'react'
import WidgetLayout from '../../components/WidgetLayout'
import { useFont } from './font'
import styles from './styles.module.css'

export default function LogoWidget() {
  const [text, setText] = useState('')
  const [width, setWidth] = useState(320)
  const fontState = useFont()

  const ready = fontState.status === 'ready'
  const canExport = ready && text.length > 0

  const sidebar = (
    <div className={styles.sidebarInner}>
      <h2 className={styles.title}>Roundabout Logo Generator</h2>
      <p className={styles.description}>Type a location, set a width, download SVG or PNG.</p>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="logo-text">Location name</label>
        <input
          id="logo-text"
          className={styles.input}
          placeholder="BROOKLYN"
          value={text}
          onChange={e => setText(e.target.value.toUpperCase())}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="logo-width">Width (px)</label>
        <input
          id="logo-width"
          className={styles.input}
          type="number"
          min={100}
          max={2000}
          value={width}
          onChange={e => setWidth(Number(e.target.value) || 0)}
          onBlur={() => setWidth(w => Math.max(100, Math.min(2000, w || 100)))}
        />
      </div>

      {fontState.status === 'loading' && <p className={styles.status}>Loading font…</p>}
      {fontState.status === 'error' && (
        <p className={styles.statusError}>Font failed to load: {fontState.error}</p>
      )}

      <div className={styles.actions}>
        <button className={`${styles.button} ${styles.primary}`} disabled={!canExport}>
          Download SVG
        </button>
        <button className={`${styles.button} ${styles.secondary}`} disabled={!canExport}>
          Download PNG
        </button>
      </div>
    </div>
  )

  const main = (
    <div className={styles.previewWrap}>
      {!ready && <span className={styles.placeholder}>Waiting for font…</span>}
      {ready && <span className={styles.placeholder}>Type a location to preview.</span>}
    </div>
  )

  return <WidgetLayout sidebar={sidebar} main={main} />
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/logo/index.tsx
git commit -m "feat: scaffold logo widget component with sidebar controls"
```

---

## Task 8: Wire live preview

**Files:**
- Modify: `src/widgets/logo/index.tsx`

- [ ] **Step 1: Add preview rendering**

Edit `src/widgets/logo/index.tsx`. Add imports and replace the `main` block:

```tsx
import { useState, useRef, useMemo } from 'react'
import WidgetLayout from '../../components/WidgetLayout'
import { useFont } from './font'
import { computeLayout } from './layout'
import { ROUNDABOUT_PATH, ROUNDABOUT_NATIVE_WIDTH } from './roundabout-path'
import styles from './styles.module.css'
```

Inside the component body (after `const ready = ...`):

```tsx
const svgRef = useRef<SVGSVGElement>(null)
const layout = useMemo(
  () => (fontState.status === 'ready' ? computeLayout(fontState.font, text, width) : null),
  [fontState, text, width]
)
```

Note: the discriminator (`fontState.status === 'ready'`) must be checked inside the `useMemo` callback — TypeScript only narrows on the inline check, not via the separately-assigned `ready` boolean above.

Replace the `main` block:

```tsx
const main = (
  <div className={styles.previewWrap}>
    {!ready && <span className={styles.placeholder}>Waiting for font…</span>}
    {ready && layout && (
      <svg
        ref={svgRef}
        className={styles.previewSvg}
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform={layout.topTransform}>
          <path d={ROUNDABOUT_PATH} fill="#66381E" />
        </g>
        {layout.textPathD && <path d={layout.textPathD} fill="#66381E" />}
      </svg>
    )}
  </div>
)
```

Note: the top group's `transform` is `scale(s)` applied to a path drawn in native (320 × 42) coordinates. That makes `ROUNDABOUT_PATH` size-independent — the same path data works at any width.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit`

Expected: no errors.

- [ ] **Step 3: Manual smoke check (optional but helpful)**

If a dev server is convenient, run `npm run dev` and visit `http://localhost:5173/logo` — note that registration happens in Task 13, so the URL won't resolve yet. Instead, manually import the component into the home page or skip this step and rely on Task 12 + Task 14.

- [ ] **Step 4: Commit**

```bash
git add src/widgets/logo/index.tsx
git commit -m "feat: render live svg preview in logo widget"
```

---

## Task 9: Wire SVG download

**Files:**
- Modify: `src/widgets/logo/index.tsx`

- [ ] **Step 1: Add the download handler**

Edit `src/widgets/logo/index.tsx`. Add the `serializeSvg`, `downloadBlob`, `slugify` imports:

```tsx
import { serializeSvg, downloadBlob, slugify } from './export'
```

Inside the component, before `sidebar`:

```tsx
function handleDownloadSvg() {
  if (!svgRef.current) return
  const svgString = serializeSvg(svgRef.current)
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, `roundabout-${slugify(text)}.svg`)
}
```

Wire it onto the SVG button:

```tsx
<button
  className={`${styles.button} ${styles.primary}`}
  disabled={!canExport}
  onClick={handleDownloadSvg}
>
  Download SVG
</button>
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/logo/index.tsx
git commit -m "feat: wire svg download button in logo widget"
```

---

## Task 10: Wire PNG download

**Files:**
- Modify: `src/widgets/logo/index.tsx`

- [ ] **Step 1: Add the PNG handler**

Edit `src/widgets/logo/index.tsx`. Add `rasterizeToPng` to the export imports:

```tsx
import { serializeSvg, rasterizeToPng, downloadBlob, slugify } from './export'
```

Add a state field for an async error and the handler:

```tsx
const [pngError, setPngError] = useState<string | null>(null)

async function handleDownloadPng() {
  if (!svgRef.current || !layout) return
  setPngError(null)
  try {
    const svgString = serializeSvg(svgRef.current)
    const blob = await rasterizeToPng(svgString, layout.width, layout.height)
    downloadBlob(blob, `roundabout-${slugify(text)}.png`)
  } catch (e) {
    setPngError(String(e instanceof Error ? e.message : e))
  }
}
```

Render the error (below the existing status block):

```tsx
{pngError && <p className={styles.statusError}>PNG export failed: {pngError}</p>}
```

Wire the handler onto the PNG button:

```tsx
<button
  className={`${styles.button} ${styles.secondary}`}
  disabled={!canExport}
  onClick={handleDownloadPng}
>
  Download PNG
</button>
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/logo/index.tsx
git commit -m "feat: wire png download button in logo widget"
```

---

## Task 11: Register widget at index 0

**Files:**
- Modify: `src/widgets.ts`

- [ ] **Step 1: Add the registry entry**

Edit `src/widgets.ts`. Insert the new widget at index 0:

```ts
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
    name: 'Roundabout Logo Generator',
    description: 'Generate the Roundabout location logo as SVG or PNG',
    path: '/logo',
    component: lazy(() => import('./widgets/logo')),
  },
  {
    name: 'Newsletter Map',
    description: 'Generate a styled map graphic for newsletters',
    path: '/newsletter-map',
    component: lazy(() => import('./widgets/newsletter-map')),
  },
]
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets.ts
git commit -m "feat: register logo widget at /logo as the first home gallery entry"
```

---

## Task 12: Component smoke tests

**Files:**
- Create: `src/widgets/logo/index.test.tsx`

We mock the `./font` module to provide a fake font without loading the real `.otf` binary in jsdom. We also mock `./export` so we don't have to stub canvas APIs.

- [ ] **Step 1: Write the tests**

Create `src/widgets/logo/index.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Build a synthetic "font" that satisfies opentype.Font's shape for our usage.
const fakeFont = {
  getPath(text: string, x: number, y: number, fontSize: number) {
    const w = text.length * fontSize * 0.5
    return {
      toPathData() { return `M${x},${y} h${w}` },
      getBoundingBox() { return { x1: 0, y1: -fontSize * 0.7, x2: w, y2: fontSize * 0.2 } },
    }
  },
}

vi.mock('./font', () => ({
  FONT_PATH: '/fonts/SantaAna-SemiBold.otf',
  loadFont: vi.fn(() => Promise.resolve(fakeFont)),
  useFont: () => ({ status: 'ready', font: fakeFont }),
}))

vi.mock('./export', () => ({
  serializeSvg: vi.fn(() => '<svg/>'),
  rasterizeToPng: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
  downloadBlob: vi.fn(),
  slugify: (s: string) => s.toLowerCase() || 'roundabout',
}))

import LogoWidget from './index'
import * as exportModule from './export'

function renderWidget() {
  return render(
    <MemoryRouter>
      <LogoWidget />
    </MemoryRouter>
  )
}

describe('LogoWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the location name and width inputs', () => {
    renderWidget()
    expect(screen.getByLabelText(/location name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/width/i)).toBeInTheDocument()
  })

  it('uppercases typed location text', () => {
    renderWidget()
    const input = screen.getByLabelText(/location name/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'brooklyn' } })
    expect(input.value).toBe('BROOKLYN')
  })

  it('disables export buttons when text is empty', () => {
    renderWidget()
    expect(screen.getByRole('button', { name: /download svg/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled()
  })

  it('enables export buttons after text is entered', () => {
    renderWidget()
    fireEvent.change(screen.getByLabelText(/location name/i), { target: { value: 'LA' } })
    expect(screen.getByRole('button', { name: /download svg/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /download png/i })).not.toBeDisabled()
  })

  it('renders an inline preview svg with two paths when text is non-empty', () => {
    const { container } = renderWidget()
    fireEvent.change(screen.getByLabelText(/location name/i), { target: { value: 'LA' } })
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // Top section path + text outline path
    expect(svg!.querySelectorAll('path').length).toBe(2)
    // No <text> element — guarantees we're outlining, not relying on fonts.
    expect(svg!.querySelector('text')).toBeNull()
  })

  it('renders only the top section (one path) when text is empty', () => {
    const { container } = renderWidget()
    // After font load, the SVG always renders. Empty text means textPathD is null,
    // so only the top section path appears.
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.querySelectorAll('path').length).toBe(1)
  })

  it('calls serializeSvg + downloadBlob when SVG download is clicked', () => {
    renderWidget()
    fireEvent.change(screen.getByLabelText(/location name/i), { target: { value: 'LA' } })
    fireEvent.click(screen.getByRole('button', { name: /download svg/i }))
    expect(exportModule.serializeSvg).toHaveBeenCalled()
    expect(exportModule.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'roundabout-la.svg')
  })

  it('calls rasterizeToPng + downloadBlob when PNG download is clicked', async () => {
    renderWidget()
    fireEvent.change(screen.getByLabelText(/location name/i), { target: { value: 'LA' } })
    fireEvent.click(screen.getByRole('button', { name: /download png/i }))
    await waitFor(() => {
      expect(exportModule.rasterizeToPng).toHaveBeenCalled()
      expect(exportModule.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'roundabout-la.png')
    })
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npm test -- index.test`

Expected: PASS, 8 tests.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/logo/index.test.tsx
git commit -m "test: add smoke tests for logo widget"
```

---

## Task 13: Full test + build verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all tests pass. There should be tests from `roundabout-path`, `layout`, `index` (logo), plus the pre-existing `newsletter-map` and `WidgetLayout` tests.

- [ ] **Step 2: Run a production build**

Run: `npm run build`

Expected: build completes without errors. The bundle includes opentype.js (~150KB minified) — that's expected.

- [ ] **Step 3: Manual browser verification**

Run: `npm run dev`

Visit `http://localhost:5173`. Verify:

1. Home gallery shows "Roundabout Logo Generator" as the first card.
2. Click it → URL becomes `/logo`, sidebar and preview render.
3. The status line briefly shows "Loading font…" then disappears.
4. Type `BROOKLYN` → the preview updates live, the ROUNDABOUT graphic and the location text are both visible and left-aligned.
5. Type a very short value like `LA` → text scales up to fill the width.
6. Type a longer value like `SAN FRANCISCO` → text scales down to fill the width.
7. Change width to `640` → the whole logo doubles in size.
8. Click "Download SVG" → file downloads. Open it in a browser or vector editor; verify no `<text>` element exists, only `<path>` elements, and that the result renders identically without the Santa Ana font installed.
9. Click "Download PNG" → file downloads. Open it; verify transparent background, sharp edges, and that the location text reads correctly.
10. Clear the text → preview disappears (or shows only the top section); both download buttons disable.

If any of these fail, fix and commit before moving on.

- [ ] **Step 4: Commit anything from manual fixes**

If you made fixes during manual verification, commit them with a clear message describing what was wrong and what changed.

---

## Spec coverage check

- ✅ Two-part logo (fixed ROUNDABOUT header + dynamic location) — Tasks 2, 4, 8.
- ✅ ROUNDABOUT scaled proportionally to fill the configured width — Task 4 (`topTransform`), Task 8 (rendered).
- ✅ Color `#66381E` for both sections — Task 8.
- ✅ Configurable width with 320px default — Task 7.
- ✅ Gap = (width / 320) × 15 — Task 4 (`NATIVE_GAP * topScale`).
- ✅ Ink width of text exactly equals logo width — Task 4 (verified by test).
- ✅ Left ink edge aligns to x=0 — Task 4 (verified by test).
- ✅ Baseline = topH + gap + cap_height (ascent above baseline) — Task 4.
- ✅ Total height = baseline + descender — Task 4.
- ✅ Font measurement via opentype.js — Tasks 3, 4.
- ✅ SVG export with text converted to outlines, no font dependency — Tasks 4 (`toPathData`), 5 (`serializeSvg`), 9.
- ✅ PNG export with transparent background — Task 5 (`rasterizeToPng`), Task 10.
- ✅ Live preview that updates on type or width change — Task 8 (`useMemo`).
- ✅ Auto-uppercased text input — Task 7.
- ✅ Number input for width — Task 7.
- ✅ Edge case: empty input disables export — Task 7 (`canExport`).
- ✅ Edge case: width below 100 clamped — Task 7 (`onBlur`).
- ✅ Edge cases: very short / very long strings — Task 13, Step 3 (manual checks 5, 6).
