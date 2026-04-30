import type { LazyExoticComponent, FC } from 'react'

export interface Widget {
  name: string
  description: string
  path: string
  component: LazyExoticComponent<FC>
}

// Register new widgets here. Each entry drives both the home page gallery and the router.
export const widgets: Widget[] = []
