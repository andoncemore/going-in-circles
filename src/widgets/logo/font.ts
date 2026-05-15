import { useEffect, useState } from 'react'
import { parse, type Font } from 'opentype.js'

export const FONT_PATH = '/fonts/SantaAna-SemiBold.otf'

let cached: Promise<Font> | null = null

export function loadFont(): Promise<Font> {
  if (!cached) {
    cached = fetch(FONT_PATH)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch font: ${res.status} ${res.statusText}`)
        return res.arrayBuffer()
      })
      .then(buf => parse(buf))
  }
  return cached
}

export type FontState =
  | { status: 'loading' }
  | { status: 'ready'; font: Font }
  | { status: 'error'; error: string }

export function useFont(): FontState {
  const [state, setState] = useState<FontState>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    loadFont()
      .then(font => { if (!cancelled) setState({ status: 'ready', font }) })
      .catch(e => { if (!cancelled) setState({ status: 'error', error: String(e?.message ?? e) }) })
    return () => { cancelled = true }
  }, [])
  return state
}
