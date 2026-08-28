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
    name: 'Chicago Logo Generator',
    description: 'Generate the Chicago neighborhood logo as SVG or PNG',
    path: '/chicago-logo',
    component: lazy(() => import('./widgets/chicago-logo')),
  },
  {
    name: 'Newsletter Map',
    description: 'Generate a styled map graphic for newsletters',
    path: '/newsletter-map',
    component: lazy(() => import('./widgets/newsletter-map')),
  },
]
