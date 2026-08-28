import { useEffect, useState } from 'react'
import { parse, type Font } from 'opentype.js'

const cache = new Map<string, Promise<Font>>()

export function loadFont(path: string): Promise<Font> {
  const hit = cache.get(path)
  if (hit) return hit

  const pending = fetch(path)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch font: ${res.status} ${res.statusText}`)
      return res.arrayBuffer()
    })
    .then(buf => parse(buf))
  cache.set(path, pending)
  return pending
}

export type FontState =
  | { status: 'loading' }
  | { status: 'ready'; font: Font }
  | { status: 'error'; error: string }

export function useFont(path: string): FontState {
  const [state, setState] = useState<FontState>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    loadFont(path)
      .then(font => { if (!cancelled) setState({ status: 'ready', font }) })
      .catch(e => { if (!cancelled) setState({ status: 'error', error: String(e?.message ?? e) }) })
    return () => { cancelled = true }
  }, [path])
  return state
}
