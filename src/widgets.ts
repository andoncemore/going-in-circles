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
    name: 'Newsletter Map',
    description: 'Generate a styled map graphic for newsletters',
    path: '/newsletter-map',
    component: lazy(() => import('./widgets/newsletter-map')),
  },
]
