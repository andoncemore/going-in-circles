# Going in Circles

An internal tool site for the Roundabout team — a small, growing collection of in-browser graphics generators and design utilities. Each tool ("widget") lets a team member fill in some inputs, preview output, and export it (PNG, SVG, etc.).

Not public-facing.

## Widgets

- **Newsletter Map** — generates a styled map graphic for newsletters, with custom locations, aspect ratios, and a self-hosted Stamen Toner style.

## Stack

- Vite + React 19 + TypeScript
- React Router v7 for client-side routing between widgets
- Vitest + React Testing Library for tests
- Netlify for hosting (static site + serverless functions when a widget needs to proxy an API)

## Local development

```bash
npm install       # first time only
npm run dev       # dev server at http://localhost:5173
npm test          # run tests
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

## Project structure

```
src/
  widgets.ts          # Widget registry — add new widgets here
  widgets/            # One subfolder per widget
  pages/Home.tsx      # Gallery page (reads from the registry)
  components/
    WidgetLayout.tsx  # Shared two-column shell for widget pages
netlify/
  functions/          # Serverless API proxies (add per widget as needed)
public/
  _redirects          # Netlify SPA routing rule
  fonts/              # Self-hosted font glyphs for the map widget
```

## Adding a new widget

1. Create `src/widgets/your-widget-name/index.tsx`.
2. Build the widget using `WidgetLayout` for the page shell — it provides a sidebar slot and a main slot. Fill them however the widget needs (live preview, generate button, export controls, etc.).
3. Add an entry to `src/widgets.ts`:

   ```ts
   {
     name: 'Your Widget Name',
     description: 'Short description shown on the home page',
     path: '/your-widget-name',
     component: lazy(() => import('./widgets/your-widget-name')),
   }
   ```

The home page gallery and the router pick it up automatically.

## Using the Anthropic API from a widget

If a widget needs to call the Anthropic API, do not call it directly from the browser — proxy through a Netlify Function so the API key stays server-side:

1. Add `ANTHROPIC_API_KEY` in Netlify → Site settings → Environment variables.
2. Add a function under `netlify/functions/` that forwards the request.
3. Call your function from the widget.

## Deployment

Netlify deploys automatically on every push to `main`.
