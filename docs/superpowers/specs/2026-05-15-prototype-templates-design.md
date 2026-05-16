# Prototype Templates — Design

**Date:** 2026-05-15
**Status:** Approved (pending user re-read of this written spec)

## Overview

Introduce a "templates" system for prototypes — a small set of reusable building blocks that let an exploration get from zero to a recognizable mockup quickly, without each prototype reinventing chrome. Modeled on the structure of the official `playground` plugin: a small shared core plus per-template guidance documents that describe intent.

Templates split along two axes:

- **Shape** — the container that defines viewport size and any device chrome (e.g., a phone shell on a dotted canvas).
- **Style** — the visual language applied to whatever the prototype puts inside (e.g., low-fi grayscale wireframe).

A prototype picks one of each. Day one ships one shape (`mobile`) and one style (`wireframe`). The infrastructure must make adding a second shape or style cheap.

## Motivation

The prototypes infrastructure (registry + routing + Home section) landed in `2026-05-15-prototypes-section-design.md`, but the registry is empty. Before adding actual prototypes, the team wants reusable scaffolding so explorations stay focused on functional content, not on rebuilding a phone frame or hand-rolling grayscale styles each time. The first real prototype — and every subsequent one — should be able to drop into a frame and write near-plain JSX.

## Architecture

### Two axes, composed at usage time

Templates are not named combinations. A prototype composes a shape and a style explicitly:

```tsx
<div className={wireframe.root}>     // style: canvas + fonts + palette
  <MobileFrame>                      // shape: phone chrome + screen
    {/* prototype content */}
  </MobileFrame>
</div>
```

Combinations like "desktop-wireframe" or "mobile-polished" come for free — they're new files in `frames/` or new folders in `styles/`. There is no template registry, no enumeration of valid combinations, and no scaffolding CLI; templates are just imports.

### Asymmetry between shapes and styles

The two axes have different shapes (the file kinds, not the visual kind):

- A **shape** is essentially one component + one stylesheet. Flat files in `frames/`.
- A **style** is a bundle: a stylesheet, helpers for things CSS can't fake, and a guidance markdown describing intent. One folder per style in `styles/`.

This asymmetry is intentional — it matches what each axis actually contains.

### File layout

```
src/prototypes/_shared/
  frames/
    MobileFrame.tsx
    MobileFrame.module.css
  styles/
    wireframe/
      wireframe.module.css
      wireframe.md
      TextLines.tsx
      index.ts
```

The `_shared/` folder uses the underscore prefix to signal "not a prototype itself" — the file-system equivalent of marking it private within the prototypes subtree.

## MobileFrame (shape)

### What it renders

A phone-shaped device sized at roughly **390 × 844 px** (iPhone-ish proportions). Outer rounded shell, top speaker stripe, side-button stripe, screen area that holds children. Fixed dimensions — explorations want a consistent reference viewport, not responsive variability.

### API

```tsx
interface Props {
  children: ReactNode
}

<MobileFrame>{/* anything */}</MobileFrame>
```

That's the entire API for day one. No props for screen background, chrome variants, or sizing. If we discover we need them, add them then.

### What it does NOT include

- Page-level background (the dotted canvas).
- Body fonts or palette variables.
- Centering its containing viewport.

These are **style concerns**, not shape concerns. The wireframe sketch-paper look comes from `wireframe.module.css`. A future polished style applied to the same frame would paint a neutral page background instead of dotted grid, but the phone shape would be unchanged.

### Implementation notes

- `MobileFrame.module.css` defines `.device`, `.screen`, `.speaker`, `.sideButton`. No hardcoded color values — uses CSS variables that the wrapping style class is expected to define (e.g., `var(--wf-strong, #2a2a2a)` with a fallback). This way the shape renders correctly even outside a styled wrapper.
- Screen area uses `overflow: hidden` so children that exceed the viewport clip naturally.
- Children's responsibility is to render correctly within roughly 390 × 810 px of inner content space.

## Wireframe (style)

The style folder bundles three artifacts: a stylesheet, a helper, and a guidance doc. Phosphor icons are a documented dependency, not a wrapper component.

### `wireframe.module.css`

Exports two CSS module classes plus a set of CSS variables.

**`.root`** — the page-level wrapper:

- Paints the dotted canvas background.
- Sets default body font to Arial. Flow Circular is loaded from Google Fonts (loading mechanism — `@import`, `<link>` in `index.html`, or Vite-managed — is an implementation detail).
- Defines the palette as CSS variables (so `MobileFrame.module.css` and helpers read from them).
- Centers its content vertically and horizontally (so `<MobileFrame>` sits in the middle of the viewport).
- Applies element-level base styles to descendants: heading scale, `button` chrome (dark fill, rounded corners, white text, no border), `.card` chrome (white surface, rounded corners, padding), spacing defaults.

**`.placeholder`** — utility class that switches font to Flow Circular. Use this for inline "this would be real copy" body text. The prototype writes real prose; visually it renders as wiggly bars.

**CSS variables defined on `.root`:**

```
--wf-ink:        #1a1a1a   ← buttons, icons, strong fills
--wf-strong:     #2a2a2a   ← phone chrome, deep grey surfaces
--wf-medium:     #888888   ← text bars on light surfaces, dividers
--wf-weak:       #d8d8d8   ← text bars on dark surfaces
--wf-surface:    #ffffff   ← cards, sheets
--wf-canvas:     #f1f1f1   ← dotted background base
--wf-radius-sm:  6px
--wf-radius-md:  12px
--wf-radius-lg:  20px
```

Exact values are starting points the team can tweak. The point is grayscale only. `MobileFrame` reads from these variables for its chrome and screen colors, with `var(--name, fallback)` fallbacks so it still renders unstyled. The specific variable-to-element mapping is left to implementation.

### `TextLines.tsx`

```tsx
interface Props {
  count?: number                       // default 3
  variant?: 'on-light' | 'on-dark'     // picks --wf-medium vs --wf-weak
}
```

Renders `count` stacked horizontal bars (divs) styled with the selected fill color. The last bar is rendered narrower (~60% width) so a "paragraph" reads ragged. Used for explicit block-shaped placeholders — the screenshot's card bodies. For inline prose-shaped placeholders, the prototype uses the `.placeholder` class with Flow Circular instead.

### `wireframe.md`

The guidance doc, written as a design brief in plain prose. Opens with the team's wireframe purpose statement verbatim:

> "Wireframes act as the skeletal blueprint for a digital product. They are used in UX design to outline page structure, establish user flows, define information architecture, and align teams on functionality early in the process — all before time is invested in visual design."

Sections:

1. **Purpose** — the quote above plus the one-line operating principle: "show functional behavior without committing to visual decisions." Notes that exact greys, exact spacing, and exact font sizes are not the point — if you find yourself tweaking those, you've drifted out of wireframe mode.
2. **Materials** — strict grayscale palette (no brand colors), Arial for real labels, Flow Circular for placeholder copy, Phosphor for icons. Separation between cards/sheets and their background is **tonal**, not strokes — white surfaces float on grey canvas; no black outlines.
3. **How to use** — the canonical setup: `<div className={wireframe.root}><MobileFrame>...</MobileFrame></div>`, the available utility classes (`.placeholder`, `.card`), the `<TextLines />` helper, and how to import Phosphor icons (`import { Star } from '@phosphor-icons/react'`).
4. **Patterns** — short JSX snippets for common compositions: a header card, a list row with title + body, a primary CTA button, a sheet/modal overlay (the structure shown in the reference screenshot — a white sheet sitting on a darker phone-screen background, with a close affordance, stacked cards, and a CTA strip).
5. **Anti-patterns** — explicit list of what to avoid:
   - Adding any non-grayscale color.
   - Switching to fonts other than Arial / Flow Circular.
   - Pixel-pushing radii, paddings, or font sizes (use the CSS variables as-is).
   - Black strokes around cards or surfaces — separation is tonal in this system.
   - Drop shadows or other elevation effects.
   - High-fidelity icons, illustrations, or photos.
   - Building wireframe-specific React components inside a prototype — the helpers in this folder are the only abstraction this system has.

The doc reads top-to-bottom — a person (or Claude) can scan it once and be ready to write a wireframe-style prototype.

### Phosphor dependency

Adds `@phosphor-icons/react` to `package.json`. Prototypes import directly:

```tsx
import { Star, X } from '@phosphor-icons/react'
```

The wireframe stylesheet sets `svg { color: var(--wf-ink) }` inside `.root` so icons pick up the ink color automatically. No wrapper component — prototypes use Phosphor's named exports as-is.

## Tests

### New

**`src/prototypes/_shared/frames/MobileFrame.test.tsx`**
- Renders children inside the screen area.
- Renders without crashing when no wrapping style class is present (verifies the CSS-variable fallbacks work).

**`src/prototypes/_shared/styles/wireframe/TextLines.test.tsx`**
- Renders `count` lines (default 3).
- Last line has the narrower-width modifier class applied.

### Not tested

- `wireframe.module.css` — CSS modules don't need unit tests; visual correctness is verified by the manual sanity check below.
- `wireframe.md` — documentation, not behavior.

## What this work does NOT touch

- `src/widgets/`, `widgets.ts`, `src/components/WidgetLayout.tsx` — unchanged. Widgets remain separate from prototypes.
- `src/prototypes.ts` — registry stays empty. This work adds *infrastructure*, not a prototype.
- `src/App.tsx` and routing — unchanged. Templates are imports, not routes.
- `src/pages/Home.tsx` — unchanged. The Prototypes section already handles the empty-registry case.
- `netlify/functions/` and `public/_redirects` — unchanged.

## Out of scope

The following are intentionally deferred to follow-up work:

1. **Any actual prototype** — the `src/prototypes/` folder remains empty.
2. **A `desktop` shape** — added when the first desktop-shaped prototype needs it.
3. **A second style** (e.g., `polished`) — added when needed.
4. **Style composition** — only one style applies at a time. No mixing.
5. **A scaffolding CLI or generator** — prototypes are created by hand.
6. **Renaming or reorganizing existing widget code.**

## Success criteria

- `npm test` passes, including the two new test files.
- `npm run build` succeeds.
- A throwaway prototype file (not committed) containing
  ```tsx
  <div className={wireframe.root}>
    <MobileFrame>
      <TextLines count={3} />
    </MobileFrame>
  </div>
  ```
  renders a centered phone with three bar-paragraphs inside, on a dotted-grey canvas. Manual sanity check, not a committed test.
- `wireframe.md` is readable end-to-end and self-contained — someone (or Claude) can read it once and produce a wireframe-style prototype without further instruction.

## Next steps after this lands

The natural follow-up is "add the first real prototype." At that point the team picks a frame and a style (initially just `MobileFrame` + `wireframe`), creates a folder under `src/prototypes/<slug>/`, and adds an entry to `src/prototypes.ts`. The wireframe guidance doc is the working reference.
