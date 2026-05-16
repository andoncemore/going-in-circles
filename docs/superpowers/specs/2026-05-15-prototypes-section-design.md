# Prototypes Section — Design

**Date:** 2026-05-15
**Status:** Approved (pending user re-read of this written spec)

## Overview

Add a "Prototypes" concept to the site, parallel to the existing "Widgets" concept. A prototype is a one-off exploration — less tool-like than a widget — that lives on its own page, listed in a new section on the homepage. This document specifies the infrastructure only; no actual prototypes, templates, or example pages are built as part of this work.

## Motivation

The site currently hosts only widgets (tools with inputs/outputs/exports). The team also wants a place for exploratory pages — visual studies, mockups, one-off experiments. These don't fit the widget model (no sidebar/main split, no export flow), but they should still be discoverable from the homepage and routable like widgets are.

## Architecture

### Two parallel registries

A new `src/prototypes.ts` is added alongside the existing `src/widgets.ts`. The two registries are kept separate (rather than unified with a `type` discriminator) because they will diverge:

- Prototypes are expected to gain fields like `group` for categorization.
- Widgets are not.

Separate registries let each evolve without forcing fields on the other.

### Prototype shape

```ts
// src/prototypes.ts
import { lazy } from 'react'
import type { LazyExoticComponent, FC } from 'react'

export interface Prototype {
  name: string
  description: string
  path: string         // must start with /prototypes/
  component: LazyExoticComponent<FC>
}

export const prototypes: Prototype[] = []
```

The shape is identical to `Widget` today, but a separate `Prototype` interface is declared (not a type alias) so the two can diverge cleanly.

### File layout

```
src/
  widgets.ts                   ← existing
  widgets/<slug>/index.tsx     ← existing
  prototypes.ts                ← new
  prototypes/<slug>/index.tsx  ← new convention (empty folder on day one)
```

### Path convention

Every entry in `prototypes` must have a `path` that starts with `/prototypes/`. The registry test enforces this. Widget paths remain unconstrained.

### Routing

`src/App.tsx` is updated so its `<Routes>` block registers routes from both registries:

```tsx
<Routes>
  <Route path="/" element={<Home />} />
  {widgets.map((widget) => {
    const Component = widget.component
    return <Route key={widget.path} path={widget.path} element={<Component />} />
  })}
  {prototypes.map((prototype) => {
    const Component = prototype.component
    return <Route key={prototype.path} path={prototype.path} element={<Component />} />
  })}
</Routes>
```

The widget loop is unchanged from the existing code; only the prototype loop is added.

## Homepage UI

The homepage `src/pages/Home.tsx` is restructured into two stacked sections on the same page. The current page-level `<h1>Tools</h1>` is demoted to an `<h2>` section heading, and a new `<h2>Prototypes</h2>` section is added below. There is no overarching page-level title — the two section headings carry the page.

### Layout (textual mock)

```
Tools                                       ← h2 section heading
Graphics generators and design utilities.   ← section subtitle

[ Logo Generator ]   [ Newsletter Map ]     ← existing card grid (unchanged)

Prototypes                                  ← h2 section heading
One-off explorations.                       ← section subtitle

Digital flyer  — A4 portrait newsletter mockup    ← compact list rows
Mobile widget — phone-sized container test         (only render if prototypes is non-empty)
Map pin styles — exploring marker variants
```

### Prototype list style

Each prototype row is a single-line `<Link>`:

- Name in regular weight, default text color.
- An em-dash separator.
- Description in the same muted color (`#666`) used for widget card descriptions.
- The entire row is clickable.
- Tight vertical spacing so ~20 items remain comfortable to scan.

### Empty-state behavior

If `prototypes` is empty (the day-one state), the entire Prototypes section — heading, subtitle, and list — is hidden. No "nothing here yet" message. This keeps the page visually clean until real prototypes exist.

### CSS approach

`src/pages/Home.module.css` is updated as follows:

- `.title` / `.subtitle` are renamed to `.sectionHeading` / `.sectionSubtitle` since they now denote section-level (not page-level) titles. Both sections share these styles.
- New classes are added: `.prototypeList`, `.prototypeRow`, `.prototypeName`, `.prototypeDescription`.
- The existing `.grid`, `.card`, `.cardTitle`, `.cardDescription` styles are untouched (still used by the Tools section).

## Tests

### New

**`src/prototypes.test.ts`** — mirrors `src/widgets.test.ts`. Asserts:
- `prototypes` is an array.
- Each entry has string `name`, `description`, `path`.
- Each entry has a defined `component` (typeof `'object'`, since lazy components are objects).
- **Each `path` matches `/^\/prototypes\//`** (the path-prefix invariant).

### Updated

**`src/pages/Home.test.tsx`** — extended with:
- A `vi.mock('../prototypes', …)` block alongside the existing widgets mock.
- Assertions that an "Tools" heading and a "Prototypes" heading both render when both registries are non-empty.
- Assertions that each mocked prototype renders as a link to its `/prototypes/...` path with its name and description visible.
- An assertion that when the prototypes mock is empty, the "Prototypes" heading does **not** render. (This can be a separate test that re-mocks `../prototypes` with `[]`.)
- Existing widget assertions are retained.

**`src/App.test.tsx`** — reviewed during implementation. If it asserts on specific route paths or registration counts, extended to cover a mocked prototype route. If it only smoke-tests rendering, left alone.

## Unchanged

The following files/concepts are explicitly not touched by this work:

- `src/components/WidgetLayout.tsx` and its tests — prototypes don't have to use it; widget usage is unchanged.
- `netlify/functions/` — prototypes can add functions later the same way widgets do.
- `public/_redirects` — the SPA catch-all already covers `/prototypes/*`.
- The `widgets/` folder, `widgets.ts`, and the `Widget` interface — no renaming, no restructuring.

## Out of scope

The following are intentionally deferred to follow-up work:

1. **Building any actual prototype.** The `src/prototypes/` folder exists by convention but starts empty.
2. **Building any template component** (e.g., the mobile-sized container the user mentioned). Templates are added alongside the first prototype that needs them.
3. **Grouping support.** No `group` field on `Prototype`, no subheadings in the list. The compact list format is chosen specifically so grouping is cheap to add later.
4. **A separate `/prototypes` index page or tabs.** The two-section homepage is the only entry point.
5. **Renaming or reorganizing the widget code.**

## Success criteria

- `npm test` passes, including the new `prototypes.test.ts` and the updated `Home.test.tsx`.
- `npm run build` succeeds.
- Visiting `/` on the dev server shows the existing Tools section unchanged, and no Prototypes section (because the registry is empty).
- Adding a temporary entry to `prototypes.ts` with a path like `/prototypes/foo` and a trivial component causes (a) the Prototypes section to appear on the homepage with that entry listed, and (b) `/prototypes/foo` to route to the component. (This is a manual sanity check, not a committed test.)

## Next steps after this lands

The natural follow-up is "add the first real prototype." At that point, the team decides whether the prototype needs a template (e.g., mobile container), and builds the template alongside the prototype rather than speculatively.
