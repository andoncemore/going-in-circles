# Prototype Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the prototype templates system — `MobileFrame` shape, `wireframe` style (CSS module + `TextLines` helper + guidance doc), and the Phosphor icon dependency. Infrastructure only; no actual prototypes are created.

**Architecture:** Two axes — shape and style — composed at usage time by prototypes. Shapes are flat files in `src/prototypes/_shared/frames/`. Styles are folders in `src/prototypes/_shared/styles/<name>/`, each bundling a CSS module, helpers, and a guidance markdown. No registry; templates are just imports.

**Tech Stack:** React 19, TypeScript, Vite, CSS Modules, Vitest + React Testing Library, `@phosphor-icons/react` (new), Flow Circular + Arial fonts via Google Fonts.

**Reference spec:** `docs/superpowers/specs/2026-05-15-prototype-templates-design.md`

---

## File Structure

**New files (10):**

```
src/prototypes/_shared/
  frames/
    MobileFrame.tsx              — phone-shaped device container
    MobileFrame.module.css       — chrome + screen styles, reads CSS vars w/ fallbacks
    MobileFrame.test.tsx         — renders children; survives unstyled
  styles/
    wireframe/
      wireframe.module.css       — .root + .placeholder + CSS vars + element base styles
      wireframe.md               — guidance doc (intent + materials + patterns + anti-patterns)
      TextLines.tsx              — N stacked horizontal bars
      TextLines.module.css       — line styles, reads --wf-medium / --wf-weak
      TextLines.test.tsx         — count rendering, default of 3
      index.ts                   — re-exports TextLines + wireframe CSS module
```

**Modified files (2):**

- `package.json` — adds `@phosphor-icons/react` dependency
- `index.html` — adds `<link>` to Google Fonts for Flow Circular

---

## Task 1: Add Phosphor icons dependency

**Files:**
- Modify: `package.json` (dependencies section)

- [ ] **Step 1: Install the package**

Run from repo root:
```bash
npm install @phosphor-icons/react
```

Expected: package added to `dependencies` in `package.json`; `package-lock.json` updated; no errors.

- [ ] **Step 2: Verify the install**

Run:
```bash
npm ls @phosphor-icons/react
```

Expected output (version may differ — any version is fine):
```
roundabout-logo-generator@0.0.0 /path/to/repo
└── @phosphor-icons/react@2.x.x
```

- [ ] **Step 3: Verify nothing else broke**

Run:
```bash
npm test
```

Expected: existing tests still pass. (No new tests yet.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @phosphor-icons/react dependency"
```

---

## Task 2: Load Flow Circular font

Add a `<link>` for Flow Circular to `index.html`. Arial is a system font and needs no loading. We use a `<link>` rather than `@import` in CSS to keep the loading mechanism outside CSS modules (where `@import` can produce noisy warnings in jsdom tests).

**Files:**
- Modify: `index.html` (head)

- [ ] **Step 1: Add the Google Fonts link**

Edit `index.html`. Add the two `<link rel="preconnect">` lines and the `<link href="https://fonts.googleapis.com/...">` line to the `<head>` after the existing `<meta name="viewport">` line. The resulting head should look like:

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Flow+Circular&display=swap"
    rel="stylesheet"
  />
  <title>Roundabout Tools</title>
</head>
```

- [ ] **Step 2: Verify the build still succeeds**

Run:
```bash
npm run build
```

Expected: build succeeds. (We won't visually verify font loading yet — that happens after the wireframe CSS module exists in Task 4.)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: load Flow Circular font for wireframe placeholders"
```

---

## Task 3: TextLines helper (TDD)

A small React component that renders N stacked horizontal bars. Used for block-shaped placeholder paragraphs in wireframe prototypes.

**Files:**
- Create: `src/prototypes/_shared/styles/wireframe/TextLines.tsx`
- Create: `src/prototypes/_shared/styles/wireframe/TextLines.module.css`
- Test: `src/prototypes/_shared/styles/wireframe/TextLines.test.tsx`

- [ ] **Step 1: Create the parent directories**

Run from repo root:
```bash
mkdir -p src/prototypes/_shared/styles/wireframe src/prototypes/_shared/frames
```

Expected: both directories exist.

- [ ] **Step 2: Write the failing test**

Create `src/prototypes/_shared/styles/wireframe/TextLines.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import TextLines from './TextLines'

describe('TextLines', () => {
  it('renders 3 lines by default', () => {
    const { container } = render(<TextLines />)
    expect(container.querySelectorAll('[data-line]')).toHaveLength(3)
  })

  it('renders the requested count', () => {
    const { container } = render(<TextLines count={5} />)
    expect(container.querySelectorAll('[data-line]')).toHaveLength(5)
  })

  it('marks the last line', () => {
    const { container } = render(<TextLines count={3} />)
    const lines = container.querySelectorAll('[data-line]')
    expect(lines[lines.length - 1].getAttribute('data-last')).toBe('true')
    expect(lines[0].getAttribute('data-last')).toBe('false')
  })

  it('renders with the on-dark variant', () => {
    const { container } = render(<TextLines variant="on-dark" />)
    const first = container.querySelector('[data-line]')
    expect(first?.getAttribute('data-variant')).toBe('on-dark')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run:
```bash
npm test -- TextLines
```

Expected: tests FAIL with module-not-found / cannot-resolve error for `./TextLines`.

- [ ] **Step 4: Write the CSS module**

Create `src/prototypes/_shared/styles/wireframe/TextLines.module.css`:

```css
.stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.line {
  height: 8px;
  border-radius: 4px;
  width: 100%;
}

.onLight {
  background: var(--wf-medium, #888888);
}

.onDark {
  background: var(--wf-weak, #d8d8d8);
}

.last {
  width: 60%;
}
```

- [ ] **Step 5: Write the component**

Create `src/prototypes/_shared/styles/wireframe/TextLines.tsx`:

```tsx
import styles from './TextLines.module.css'

interface Props {
  count?: number
  variant?: 'on-light' | 'on-dark'
}

export default function TextLines({ count = 3, variant = 'on-light' }: Props) {
  const variantClass = variant === 'on-dark' ? styles.onDark : styles.onLight
  return (
    <div className={styles.stack}>
      {Array.from({ length: count }).map((_, i) => {
        const isLast = i === count - 1
        return (
          <div
            key={i}
            data-line
            data-last={isLast ? 'true' : 'false'}
            data-variant={variant}
            className={`${styles.line} ${variantClass} ${isLast ? styles.last : ''}`}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run:
```bash
npm test -- TextLines
```

Expected: all 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/prototypes/_shared/styles/wireframe/TextLines.tsx \
        src/prototypes/_shared/styles/wireframe/TextLines.module.css \
        src/prototypes/_shared/styles/wireframe/TextLines.test.tsx
git commit -m "feat: add TextLines helper for wireframe placeholders"
```

---

## Task 4: Wireframe CSS module

The page-level stylesheet. Defines `.root` (wrapper), `.placeholder` (Flow Circular utility class), CSS variables, and element-level base styles applied to descendants of `.root`.

**Files:**
- Create: `src/prototypes/_shared/styles/wireframe/wireframe.module.css`

- [ ] **Step 1: Write the CSS module**

Create `src/prototypes/_shared/styles/wireframe/wireframe.module.css`:

```css
.root {
  /* Palette */
  --wf-ink: #1a1a1a;
  --wf-strong: #2a2a2a;
  --wf-medium: #888888;
  --wf-weak: #d8d8d8;
  --wf-surface: #ffffff;
  --wf-canvas: #f1f1f1;

  /* Radii */
  --wf-radius-sm: 6px;
  --wf-radius-md: 12px;
  --wf-radius-lg: 20px;

  /* Canvas */
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;

  background-color: var(--wf-canvas);
  background-image: radial-gradient(circle, #c8c8c8 1px, transparent 1px);
  background-size: 14px 14px;

  /* Typography */
  font-family: Arial, sans-serif;
  color: var(--wf-ink);
}

/* Icons inside the wireframe pick up ink color by default */
.root svg {
  color: var(--wf-ink);
}

/* Heading scale */
.root h1 {
  font-family: Arial, sans-serif;
  font-weight: 700;
  font-size: 28px;
  line-height: 34px;
  margin: 0;
}

.root h2 {
  font-family: Arial, sans-serif;
  font-weight: 700;
  font-size: 22px;
  line-height: 28px;
  margin: 0;
}

.root h3 {
  font-family: Arial, sans-serif;
  font-weight: 700;
  font-size: 16px;
  line-height: 20px;
  margin: 0;
}

/* Plain buttons inside the wireframe get the dark-fill chrome */
.root button {
  font-family: Arial, sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: var(--wf-surface);
  background: var(--wf-ink);
  border: none;
  border-radius: var(--wf-radius-md);
  padding: 12px 20px;
  cursor: pointer;
}

/* Utility: white sheet/card chrome */
.card {
  background: var(--wf-surface);
  border-radius: var(--wf-radius-md);
  padding: 16px;
}

/* Utility: render real text as Flow Circular squiggles */
.placeholder {
  font-family: 'Flow Circular', Arial, sans-serif;
  color: var(--wf-medium);
}
```

- [ ] **Step 2: Verify the build still succeeds**

Run:
```bash
npm run build
```

Expected: build succeeds with no CSS errors.

- [ ] **Step 3: Verify tests still pass**

Run:
```bash
npm test
```

Expected: all tests (including the new TextLines tests from Task 3) still pass.

- [ ] **Step 4: Commit**

```bash
git add src/prototypes/_shared/styles/wireframe/wireframe.module.css
git commit -m "feat: add wireframe style module with palette and base chrome"
```

---

## Task 5: Wireframe index re-exports

A single barrel file that lets prototypes import the CSS module and helpers from one place: `import { wireframe, TextLines } from '../../_shared/styles/wireframe'`.

**Files:**
- Create: `src/prototypes/_shared/styles/wireframe/index.ts`

- [ ] **Step 1: Write the index**

Create `src/prototypes/_shared/styles/wireframe/index.ts`:

```ts
export { default as TextLines } from './TextLines'
export { default as wireframe } from './wireframe.module.css'
```

- [ ] **Step 2: Verify the build still succeeds**

Run:
```bash
npm run build
```

Expected: build succeeds. TypeScript should resolve the CSS module import (Vite provides ambient `*.module.css` types).

- [ ] **Step 3: Commit**

```bash
git add src/prototypes/_shared/styles/wireframe/index.ts
git commit -m "feat: re-export wireframe style helpers from index"
```

---

## Task 6: MobileFrame component (TDD)

The phone-shaped device. Fixed dimensions (~390 × 844), rounded outer shell, top speaker stripe, side-button stripe, screen area for children. Reads CSS variables with fallbacks so it renders unstyled too.

**Files:**
- Create: `src/prototypes/_shared/frames/MobileFrame.tsx`
- Create: `src/prototypes/_shared/frames/MobileFrame.module.css`
- Test: `src/prototypes/_shared/frames/MobileFrame.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/prototypes/_shared/frames/MobileFrame.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MobileFrame from './MobileFrame'

describe('MobileFrame', () => {
  it('renders children inside the screen area', () => {
    render(
      <MobileFrame>
        <div data-testid="proto-content">hello</div>
      </MobileFrame>
    )
    expect(screen.getByTestId('proto-content')).toBeInTheDocument()
  })

  it('renders without throwing when no wrapping style is present', () => {
    // No <div className={wireframe.root}> wrapper.
    // Verifies CSS-variable fallbacks work and the component is self-sufficient.
    expect(() =>
      render(
        <MobileFrame>
          <div />
        </MobileFrame>
      )
    ).not.toThrow()
  })

  it('exposes the screen as an identifiable region', () => {
    render(
      <MobileFrame>
        <div data-testid="proto-content">hello</div>
      </MobileFrame>
    )
    const content = screen.getByTestId('proto-content')
    // The screen wrapper is the parent of the content
    expect(content.parentElement?.getAttribute('data-mobile-screen')).toBe('true')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm test -- MobileFrame
```

Expected: tests FAIL with module-not-found error for `./MobileFrame`.

- [ ] **Step 3: Write the CSS module**

Create `src/prototypes/_shared/frames/MobileFrame.module.css`:

```css
.device {
  width: 390px;
  height: 844px;
  background: var(--wf-strong, #2a2a2a);
  border-radius: 48px;
  padding: 10px;
  box-sizing: border-box;
  position: relative;
  flex-shrink: 0;
}

.speaker {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 110px;
  height: 22px;
  background: var(--wf-ink, #1a1a1a);
  border-radius: 999px;
}

.sideButton {
  position: absolute;
  left: -3px;
  top: 180px;
  width: 4px;
  height: 80px;
  background: var(--wf-strong, #2a2a2a);
  border-radius: 2px 0 0 2px;
}

.screen {
  width: 100%;
  height: 100%;
  background: var(--wf-medium, #888888);
  border-radius: 38px;
  overflow: hidden;
  position: relative;
}
```

- [ ] **Step 4: Write the component**

Create `src/prototypes/_shared/frames/MobileFrame.tsx`:

```tsx
import type { ReactNode } from 'react'
import styles from './MobileFrame.module.css'

interface Props {
  children: ReactNode
}

export default function MobileFrame({ children }: Props) {
  return (
    <div className={styles.device}>
      <div className={styles.speaker} aria-hidden />
      <div className={styles.sideButton} aria-hidden />
      <div className={styles.screen} data-mobile-screen="true">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
npm test -- MobileFrame
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Verify the full test suite passes**

Run:
```bash
npm test
```

Expected: all tests pass (existing + TextLines from Task 3 + the new MobileFrame tests).

- [ ] **Step 7: Commit**

```bash
git add src/prototypes/_shared/frames/MobileFrame.tsx \
        src/prototypes/_shared/frames/MobileFrame.module.css \
        src/prototypes/_shared/frames/MobileFrame.test.tsx
git commit -m "feat: add MobileFrame phone-shaped container"
```

---

## Task 7: Wireframe guidance doc

The `wireframe.md` design brief. Written for both humans and Claude — readable end-to-end, self-contained enough to scaffold a new wireframe prototype after one read.

**Files:**
- Create: `src/prototypes/_shared/styles/wireframe/wireframe.md`

- [ ] **Step 1: Write the guidance doc**

Create `src/prototypes/_shared/styles/wireframe/wireframe.md` with the content below verbatim:

````markdown
# Wireframe Style

## Purpose

> Wireframes act as the skeletal blueprint for a digital product. They are used in UX design to outline page structure, establish user flows, define information architecture, and align teams on functionality early in the process — all before time is invested in visual design.

The operating principle here is **show functional behavior without committing to visual decisions.** Exact greys, exact spacing, and exact font sizes are not the point. If you find yourself tweaking those, you've drifted out of wireframe mode.

## Materials

- **Palette:** strict grayscale only. No brand colors. The CSS variables (`--wf-ink`, `--wf-strong`, `--wf-medium`, `--wf-weak`, `--wf-surface`, `--wf-canvas`) cover everything you need.
- **Typography:**
  - **Arial** for real labels: headings, button text, section headers, anything the stakeholder will read literally.
  - **Flow Circular** (via the `.placeholder` utility class) for body content and descriptions. The text renders as illegible squiggles so reviewers focus on structure rather than reading filler copy.
- **Icons:** Phosphor (`@phosphor-icons/react`). Import what you need: `import { Star, X } from '@phosphor-icons/react'`. Icons inside `.root` automatically inherit `--wf-ink` as their color.
- **Separation:** tonal, not strokes. White surfaces float on grey canvas. **No black outlines around cards or surfaces.** Hierarchy is communicated through tone (white card on grey screen on darker chrome), not through borders.

## How to use

Canonical prototype setup:

```tsx
import MobileFrame from '../_shared/frames/MobileFrame'
import { wireframe, TextLines } from '../_shared/styles/wireframe'

export default function MyExploration() {
  return (
    <div className={wireframe.root}>
      <MobileFrame>
        {/* prototype content here */}
      </MobileFrame>
    </div>
  )
}
```

Available pieces:

- **`wireframe.root`** — wrap the whole prototype in this. It paints the dotted canvas, sets Arial as the body font, defines the palette CSS variables, and applies base styles to descendant `button`, `h1`–`h3` elements.
- **`wireframe.placeholder`** — utility class. Use on any text element to render its content as Flow Circular squiggles.
- **`wireframe.card`** — utility class for white-surface cards. White background, rounded corners, 16px padding.
- **`<TextLines count={3} variant="on-light" />`** — block-shaped placeholder bars for paragraphs. Use `variant="on-dark"` when the bars sit on a dark surface.

## Patterns

### Header card

```tsx
<div className={wireframe.card}>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <h2>Five Highlights</h2>
    <button aria-label="Close" style={{ background: 'transparent', color: 'var(--wf-ink)' }}>
      <X size={20} />
    </button>
  </div>
  <p className={wireframe.placeholder}>
    Subtitle goes here. Real-sounding copy is fine; it renders as squiggles.
  </p>
</div>
```

### List row

```tsx
<div className={wireframe.card}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <h3>Row title</h3>
    <Star size={20} weight="fill" />
  </div>
  <div style={{ marginTop: 8 }}>
    <TextLines count={4} />
  </div>
</div>
```

### Primary CTA

```tsx
<button>Share a photo</button>
```

Plain `<button>` inside `.root` already has the wireframe chrome (dark fill, white Arial bold text, rounded). No extra classes needed.

### Sheet / modal overlay

A white sheet floating on the phone screen with stacked content and a CTA strip at the bottom — matches the reference screenshot.

```tsx
<MobileFrame>
  <div style={{
    position: 'absolute',
    inset: 16,
    background: 'var(--wf-surface)',
    borderRadius: 'var(--wf-radius-lg)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  }}>
    <header>
      <p className={wireframe.placeholder} style={{ margin: 0 }}>June 18th</p>
      <h1>Five Highlights</h1>
    </header>
    <div className={wireframe.card}>{/* row 1 */}</div>
    <div className={wireframe.card}>{/* row 2 */}</div>
    <div className={wireframe.card}>
      <p className={wireframe.placeholder}>Prompt copy goes here.</p>
      <button style={{ marginTop: 8, width: '100%' }}>Share a photo</button>
    </div>
  </div>
</MobileFrame>
```

## Anti-patterns

Avoid:

- **Any non-grayscale color.** No brand colors, no accent colors, not even subtle tints.
- **Switching to fonts other than Arial / Flow Circular.** No Inter, no Helvetica, no custom fonts.
- **Pixel-pushing radii, paddings, or font sizes.** Use the CSS variables (`--wf-radius-md`, etc.) and base styles as-is.
- **Black strokes around cards or surfaces.** Separation is tonal in this system, not outlined.
- **Drop shadows or any elevation effects.** Hierarchy is communicated through tone, overlap, and stacking order.
- **High-fidelity icons, illustrations, or photos.** Use Phosphor for icons; for image placeholders use a plain grey rectangle (`<div className={wireframe.card} style={{ aspectRatio: 16/9 }} />`) — no "image with X" treatment.
- **Building wireframe-specific React components inside a prototype.** The helpers in this folder are the only abstraction. If a pattern is becoming repetitive, the answer is usually "the wireframe doesn't need that much repetition" — not "extract a component."
````

- [ ] **Step 2: Commit**

```bash
git add src/prototypes/_shared/styles/wireframe/wireframe.md
git commit -m "docs: add wireframe style guidance doc"
```

---

## Task 8: Final verification

End-to-end check: tests pass, build succeeds, and the canonical usage compiles. Optionally, a manual sanity check in the browser.

- [ ] **Step 1: Run the full test suite**

Run:
```bash
npm test
```

Expected: ALL tests pass, including:
- existing tests (App, WidgetLayout, widgets, prototypes registry, Home, logo, newsletter-map)
- `TextLines.test.tsx` — 4 tests
- `MobileFrame.test.tsx` — 3 tests

- [ ] **Step 2: Run the production build**

Run:
```bash
npm run build
```

Expected: build succeeds. Look in the output for any warnings about CSS modules or missing types — there should be none related to the new files.

- [ ] **Step 3: Verify imports resolve from a consumer's perspective**

Run from repo root:
```bash
node --input-type=module -e "
  import('./src/prototypes/_shared/styles/wireframe/index.ts').catch((e) => {
    if (e.message.includes('Unknown file extension')) {
      console.log('OK — Node cannot import .ts directly, but the import path resolves.');
      process.exit(0);
    }
    throw e;
  });
"
```

Expected: prints "OK" or exits silently. (The point is to check the path resolution, not actually execute TS at the Node CLI.)

If this check is awkward in your environment, skip it — the build in Step 2 is the authoritative check.

- [ ] **Step 4 (optional, manual): Visual sanity check**

This step is optional and produces no commit.

1. Temporarily add a throwaway file `src/prototypes/_sanity/index.tsx` containing:

   ```tsx
   import MobileFrame from '../_shared/frames/MobileFrame'
   import { wireframe, TextLines } from '../_shared/styles/wireframe'

   export default function SanityCheck() {
     return (
       <div className={wireframe.root}>
         <MobileFrame>
           <div style={{ padding: 20 }}>
             <h1>Sanity</h1>
             <p className={wireframe.placeholder}>This renders as squiggles.</p>
             <TextLines count={3} />
             <button style={{ marginTop: 12 }}>Share a photo</button>
           </div>
         </MobileFrame>
       </div>
     )
   }
   ```

2. Temporarily add an entry to `src/prototypes.ts`:

   ```ts
   import { lazy } from 'react'

   export const prototypes: Prototype[] = [
     {
       name: 'Sanity Check',
       description: 'temp',
       path: '/prototypes/_sanity',
       component: lazy(() => import('./prototypes/_sanity')),
     },
   ]
   ```

3. Run `npm run dev`. Open the dev server, click "Sanity Check" in the Prototypes section. Verify:
   - Centered phone frame on a dotted-grey canvas.
   - Inside the phone screen (mid-grey area): an Arial heading "Sanity", a squiggle paragraph, three horizontal bars, a black rounded button reading "Share a photo".

4. **Important:** revert both temporary changes (delete `src/prototypes/_sanity/` and revert `src/prototypes.ts` to its empty registry). Do NOT commit them — this work is infrastructure-only.

   ```bash
   rm -rf src/prototypes/_sanity
   git checkout src/prototypes.ts
   ```

- [ ] **Step 5: Confirm clean working tree**

Run:
```bash
git status
```

Expected: clean working tree (nothing to commit). If anything is left over from the sanity check, clean it up before declaring the work done.

---

## Done

The prototype templates infrastructure is in place. The next piece of work — adding the first real prototype — is a separate task: pick a slug, create `src/prototypes/<slug>/index.tsx` using the canonical `wireframe.root` + `MobileFrame` setup, and add a registry entry to `src/prototypes.ts`. Read `wireframe.md` first.
