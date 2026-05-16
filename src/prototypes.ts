import type { LazyExoticComponent, FC } from 'react'

export interface Prototype {
  name: string
  description: string
  path: string
  component: LazyExoticComponent<FC>
}

export const prototypes: Prototype[] = []
