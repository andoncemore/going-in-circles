# Prototypes Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add infrastructure for a "Prototypes" section parallel to the existing "Widgets" concept — a separate registry, routes namespaced under `/prototypes/`, and a second section on the homepage. No actual prototypes or templates are built; the system starts with an empty prototype registry.

**Architecture:** A new `src/prototypes.ts` registry mirrors `src/widgets.ts`. `App.tsx` registers prototype routes alongside widget routes. `Home.tsx` is restructured into two stacked sections — "Tools" (existing card grid) and "Prototypes" (compact text list, hidden when empty).

**Tech Stack:** React 19, React Router v7, TypeScript, Vitest, React Testing Library, CSS modules.

**Source spec:** `docs/superpowers/specs/2026-05-15-prototypes-section-design.md`

---

## File Structure

**Files created:**
- `src/prototypes.ts` — new registry, mirrors `widgets.ts`. Exports `Prototype` interface and `prototypes: Prototype[]` (empty on day one).
- `src/prototypes.test.ts` — registry shape test, mirrors `widgets.test.ts`, adds the `/prototypes/` path-prefix invariant.

**Files modified:**
- `src/App.tsx` — adds a second `.map()` inside `<Routes>` to register prototype routes.
- `src/App.test.tsx` — adds a test that proves a mocked prototype path is routable.
- `src/pages/Home.tsx` — restructured into two stacked sections. The page-level `<h1>` is removed; both "Tools" and "Prototypes" are `<h2>` section headings. The Prototypes section is conditionally rendered only when the registry is non-empty.
- `src/pages/Home.module.css` — rename `.title` → `.sectionHeading`, `.subtitle` → `.sectionSubtitle`. Add new classes for the prototype list. Tweak `.page` if section spacing needs it.
- `src/pages/Home.test.tsx` — adds a `vi.mock` for prototypes and tests the populated state.

**Files created (additional test file):**
- `src/pages/Home.empty-prototypes.test.tsx` — separate test file that mocks `prototypes` as empty and asserts the Prototypes section is hidden. Split into its own file because per-test re-mocking of a module-level import is fragile in Vitest.

**Files NOT touched** (per spec):
- `src/widgets.ts`, `src/widgets/`, `src/widgets.test.ts` — unchanged.
- `src/components/WidgetLayout.*` — unchanged.
- `netlify/functions/`, `public/_redirects` — unchanged.

---

## Task 1: Create the prototype registry

**Files:**
- Create: `src/prototypes.ts`
- Test: `src/prototypes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/prototypes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { prototypes } from './prototypes'

describe('prototypes registry', () => {
  it('is an array', () => {
    expect(Array.isArray(prototypes)).toBe(true)
  })

  it('each entry has required string fields and a path starting with /prototypes/', () => {
    prototypes.forEach((prototype) => {
      expect(typeof prototype.name).toBe('string')
      expect(typeof prototype.description).toBe('string')
      expect(typeof prototype.path).toBe('string')
      expect(prototype.path).toMatch(/^\/prototypes\//)
      // React lazy components are objects with _init, not plain functions
      expect(prototype.component).toBeDefined()
      expect(typeof prototype.component).toBe('object')
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- prototypes.test.ts --run`

Expected: FAIL — module `./prototypes` cannot be resolved.

- [ ] **Step 3: Create the registry**

Create `src/prototypes.ts`:

```ts
import type { LazyExoticComponent, FC } from 'react'

export interface Prototype {
  name: string
  description: string
  path: string
  component: LazyExoticComponent<FC>
}

export const prototypes: Prototype[] = []
```

(No `import { lazy }` needed yet — the array is empty. Once the first prototype is added, the entry will use `lazy(() => import('./prototypes/<slug>'))` exactly like widgets do.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- prototypes.test.ts --run`

Expected: PASS — both tests pass (the second test's `.forEach` runs zero times, which is fine).

- [ ] **Step 5: Commit**

```bash
git add src/prototypes.ts src/prototypes.test.ts
git commit -m "feat: add empty prototypes registry"
```

---

## Task 2: Register prototype routes in App.tsx

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

The existing App test verifies `/` renders "Tools". We'll add a second test that mocks the prototypes registry with one entry and verifies its path renders the mocked component.

- [ ] **Step 1: Write the failing test**

Replace `src/App.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('./prototypes', () => ({
  prototypes: [
    {
      name: 'Test Prototype',
      description: 'A prototype used only in tests',
      path: '/prototypes/test-proto',
      component: () => <div>test prototype content</div>,
    },
  ],
}))

describe('App', () => {
  it('renders the home page at /', () => {
    render(<App initialPath="/" />)
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })

  it('routes /prototypes/<slug> to the prototype component', () => {
    render(<App initialPath="/prototypes/test-proto" />)
    expect(screen.getByText('test prototype content')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- App.test.tsx --run`

Expected: FAIL on the second test — there is no route matching `/prototypes/test-proto` yet, so React Router renders nothing and the assertion fails.

The first test should still PASS.

- [ ] **Step 3: Update App.tsx to register prototype routes**

Replace the contents of `src/App.tsx` with:

```tsx
import { Suspense } from 'react'
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom'
import { widgets } from './widgets'
import { prototypes } from './prototypes'
import Home from './pages/Home'

interface Props {
  initialPath?: string
}

function AppRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
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
    </Suspense>
  )
}

export default function App({ initialPath }: Props) {
  if (initialPath !== undefined) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes />
      </MemoryRouter>
    )
  }
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
```

(The only change vs. the current file is the new `import { prototypes }` line and the second `.map()` block.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- App.test.tsx --run`

Expected: PASS — both tests pass.

- [ ] **Step 5: Run the full test suite to catch regressions**

Run: `npm test -- --run`

Expected: All tests pass. The Home test should still be green (we haven't changed Home yet); the widget tests should still be green.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: register prototype routes alongside widget routes"
```

---

## Task 3: Restructure the homepage into two sections

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Home.module.css`
- Test: `src/pages/Home.test.tsx`

- [ ] **Step 1: Write the failing tests (populated registry)**

Replace `src/pages/Home.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

vi.mock('../widgets', () => ({
  widgets: [
    {
      name: 'Logo Generator',
      description: 'Create logos with custom inputs',
      path: '/logo-generator',
      component: () => null,
    },
    {
      name: 'Map Maker',
      description: 'Build styled map images',
      path: '/map-maker',
      component: () => null,
    },
  ],
}))

vi.mock('../prototypes', () => ({
  prototypes: [
    {
      name: 'Digital Flyer',
      description: 'A4 portrait newsletter mockup',
      path: '/prototypes/digital-flyer',
      component: () => null,
    },
    {
      name: 'Mobile Widget',
      description: 'phone-sized container test',
      path: '/prototypes/mobile-widget',
      component: () => null,
    },
  ],
}))

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

describe('Home', () => {
  it('renders a Tools section heading', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'Tools', level: 2 })).toBeInTheDocument()
  })

  it('renders a card for each widget in the registry', () => {
    renderHome()
    expect(screen.getByText('Logo Generator')).toBeInTheDocument()
    expect(screen.getByText('Map Maker')).toBeInTheDocument()
  })

  it('renders widget descriptions', () => {
    renderHome()
    expect(screen.getByText('Create logos with custom inputs')).toBeInTheDocument()
    expect(screen.getByText('Build styled map images')).toBeInTheDocument()
  })

  it('links each widget card to its path', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /logo generator/i })).toHaveAttribute('href', '/logo-generator')
    expect(screen.getByRole('link', { name: /map maker/i })).toHaveAttribute('href', '/map-maker')
  })

  it('renders a Prototypes section heading when prototypes exist', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'Prototypes', level: 2 })).toBeInTheDocument()
  })

  it('renders each prototype as a link with name and description', () => {
    renderHome()
    expect(screen.getByText('Digital Flyer')).toBeInTheDocument()
    expect(screen.getByText('A4 portrait newsletter mockup')).toBeInTheDocument()
    expect(screen.getByText('Mobile Widget')).toBeInTheDocument()
    expect(screen.getByText('phone-sized container test')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /digital flyer/i })).toHaveAttribute('href', '/prototypes/digital-flyer')
    expect(screen.getByRole('link', { name: /mobile widget/i })).toHaveAttribute('href', '/prototypes/mobile-widget')
  })
})
```

- [ ] **Step 1b: Write the failing test (empty registry)**

Create a new file `src/pages/Home.empty-prototypes.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

vi.mock('../widgets', () => ({
  widgets: [
    {
      name: 'Logo Generator',
      description: 'Create logos with custom inputs',
      path: '/logo-generator',
      component: () => null,
    },
  ],
}))

vi.mock('../prototypes', () => ({
  prototypes: [],
}))

describe('Home with empty prototypes registry', () => {
  it('hides the Prototypes section when the registry is empty', () => {
    render(<MemoryRouter><Home /></MemoryRouter>)
    expect(screen.queryByRole('heading', { name: 'Prototypes' })).not.toBeInTheDocument()
  })

  it('still renders the Tools section', () => {
    render(<MemoryRouter><Home /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Tools', level: 2 })).toBeInTheDocument()
  })
})
```

Splitting this into a separate file (rather than re-mocking inside `Home.test.tsx`) keeps each file's `vi.mock` simple — Vitest hoists `vi.mock` to the top of the file, so each file gets one fixed view of `../prototypes`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- Home --run`

Expected: FAIL in both `Home.test.tsx` and `Home.empty-prototypes.test.tsx` — the heading tests fail because the current Home renders `<h1>Tools</h1>` (level 1, not level 2), and there is no Prototypes section at all.

- [ ] **Step 3: Update the CSS module**

Replace the contents of `src/pages/Home.module.css` with:

```css
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 24px;
}

.section {
  margin-bottom: 48px;
}

.section:last-child {
  margin-bottom: 0;
}

.sectionHeading {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.sectionSubtitle {
  color: #666;
  margin-bottom: 24px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.card {
  display: block;
  padding: 24px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s;
}

.card:hover {
  border-color: #999;
}

.cardTitle {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.cardDescription {
  font-size: 14px;
  color: #666;
}

.prototypeList {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prototypeRow {
  display: block;
  padding: 6px 0;
  text-decoration: none;
  color: inherit;
  font-size: 14px;
  line-height: 1.5;
}

.prototypeRow:hover .prototypeName {
  text-decoration: underline;
}

.prototypeName {
  color: inherit;
}

.prototypeDescription {
  color: #666;
}
```

(Renamed `.title` → `.sectionHeading`, `.subtitle` → `.sectionSubtitle`. Added `.section`, `.prototypeList`, `.prototypeRow`, `.prototypeName`, `.prototypeDescription`. Existing `.page`, `.grid`, `.card`, `.cardTitle`, `.cardDescription` are unchanged.)

- [ ] **Step 4: Update Home.tsx**

Replace the contents of `src/pages/Home.tsx` with:

```tsx
import { Link } from 'react-router-dom'
import { widgets } from '../widgets'
import { prototypes } from '../prototypes'
import styles from './Home.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Tools</h2>
        <p className={styles.sectionSubtitle}>Graphics generators and design utilities.</p>
        <div className={styles.grid}>
          {widgets.map((widget) => (
            <Link key={widget.path} to={widget.path} className={styles.card}>
              <div className={styles.cardTitle}>{widget.name}</div>
              <div className={styles.cardDescription}>{widget.description}</div>
            </Link>
          ))}
        </div>
      </section>

      {prototypes.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Prototypes</h2>
          <p className={styles.sectionSubtitle}>One-off explorations.</p>
          <div className={styles.prototypeList}>
            {prototypes.map((prototype) => (
              <Link key={prototype.path} to={prototype.path} className={styles.prototypeRow}>
                <span className={styles.prototypeName}>{prototype.name}</span>
                <span className={styles.prototypeDescription}> — {prototype.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

Key changes:
- Wrapped each section in `<section>` for semantics.
- "Tools" is now `<h2>` (not `<h1>`).
- Added a conditional Prototypes section with the compact list layout.
- The prototype row uses an inline `<span>` for the name and another for the em-dash + description, so the whole row is one clickable link.

- [ ] **Step 5: Run the Home tests to verify they pass**

Run: `npm test -- Home --run`

Expected: PASS — all assertions in both `Home.test.tsx` and `Home.empty-prototypes.test.tsx` pass.

- [ ] **Step 6: Run the full test suite to confirm no regressions**

Run: `npm test -- --run`

Expected: All tests pass. The existing App test should still pass because `getByText('Tools')` matches the new `<h2>` just as it matched the old `<h1>`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Home.tsx src/pages/Home.module.css src/pages/Home.test.tsx src/pages/Home.empty-prototypes.test.tsx
git commit -m "feat: split home page into Tools and Prototypes sections"
```

---

## Task 4: Manual verification

No code changes — this task verifies the build, dev server, and end-to-end behavior.

- [ ] **Step 1: Production build succeeds**

Run: `npm run build`

Expected: Build completes without errors and writes to `dist/`.

- [ ] **Step 2: Dev server renders the homepage with only the Tools section**

Run: `npm run dev`

In a browser, open `http://localhost:5173/`. Confirm:
- The "Tools" heading appears with the existing widget cards (Logo Generator, Newsletter Map).
- The "Prototypes" heading does **not** appear (registry is empty).

- [ ] **Step 3: Sanity-check routing with a temporary prototype**

Create a temporary prototype component. Do NOT commit these changes.

First, create `src/prototypes/sanity-check/index.tsx`:

```tsx
export default function SanityCheck() {
  return <div>sanity check page</div>
}
```

Then edit `src/prototypes.ts` to register it:

```ts
import { lazy } from 'react'
import type { LazyExoticComponent, FC } from 'react'

export interface Prototype {
  name: string
  description: string
  path: string
  component: LazyExoticComponent<FC>
}

export const prototypes: Prototype[] = [
  {
    name: 'Sanity Check',
    description: 'temporary entry for verifying routing',
    path: '/prototypes/sanity-check',
    component: lazy(() => import('./prototypes/sanity-check')),
  },
]
```

In the browser, confirm:
- Home now shows a "Prototypes" section with a single row: "Sanity Check — temporary entry for verifying routing".
- Clicking the row navigates to `/prototypes/sanity-check` and renders "sanity check page".

- [ ] **Step 4: Revert the temporary changes**

```bash
git checkout -- src/prototypes.ts
rm -rf src/prototypes/sanity-check
```

Confirm with `git status` that the working tree is clean.

- [ ] **Step 5: Final test pass**

Run: `npm test -- --run`

Expected: All tests pass.

(Nothing to commit here — this task is verification only.)

---

## Done criteria

- `npm test -- --run` passes.
- `npm run build` succeeds.
- `npm run dev` shows only the Tools section (because `prototypes` is empty), and no `<h1>` is present on the page.
- The git log contains three new commits (one per Task 1–3) and the working tree is clean.
