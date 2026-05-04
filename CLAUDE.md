# Roundabout Tools

A personal internal tool site for the Roundabout team. It hosts a growing collection of interactive graphics generators and design utilities — things like a logo generator, a map asset maker for newsletters, and similar tools. Not public-facing.

## Purpose

Each tool ("widget") lets a team member provide some inputs, preview output, and export in useful formats (SVG, PNG, etc). Some widgets may call the Anthropic API to generate or transform content.

## Stack

- **Vite + React 19 + TypeScript** — frontend build and component framework
- **React Router v7** — client-side routing between widgets
- **Vitest + React Testing Library** — unit tests
- **Netlify** — hosting (static site + serverless functions for API proxying)

## Running Locally

```bash
npm install       # first time only
npm run dev       # dev server at http://localhost:5173
npm test          # run tests
npm run build     # production build to dist/
npm run preview   # preview production build locally
```

## Project Structure

```
src/
  widgets.ts          # Widget registry — add new widgets here
  widgets/            # One subfolder per widget
  pages/
    Home.tsx          # Gallery page (reads from registry)
  components/
    WidgetLayout.tsx  # Shared two-column shell for widget pages
netlify/
  functions/          # Serverless API proxy functions (add per widget as needed)
public/
  _redirects          # Netlify SPA routing rule
```

## Adding a New Widget

1. Create a folder under `src/widgets/your-widget-name/` with an `index.tsx`
2. Build the widget using `WidgetLayout` for the page shell — it provides a sidebar slot and a main slot. Fill them however the widget needs (live preview, generate button, export controls, etc.)
3. Add one entry to `src/widgets.ts`:

```ts
import { lazy } from 'react'

export const widgets: Widget[] = [
  {
    name: 'Your Widget Name',
    description: 'Short description shown on the home page',
    path: '/your-widget-name',
    component: lazy(() => import('./widgets/your-widget-name')),
  },
]
```

That's it — the home page gallery and the router both update automatically.

## Anthropic API

If a widget needs to call the Anthropic API:

1. Add the API key to Netlify: **Site settings → Environment variables → `ANTHROPIC_API_KEY`**
2. Create a Netlify Function under `netlify/functions/` to proxy the request server-side
3. Call your function from the widget (not the Anthropic API directly) so the key stays server-side

## Deployment

Netlify deploys automatically on every push to `main`. No manual steps needed.
