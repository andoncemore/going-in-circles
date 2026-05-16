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
