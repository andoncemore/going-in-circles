import { useEffect, useState } from 'react'
import { load, type Font } from 'opentype.js'

export const FONT_PATH = '/fonts/SantaAna-SemiBold.otf'

let cached: Promise<Font> | null = null

export function loadFont(): Promise<Font> {
  if (!cached) cached = load(FONT_PATH)
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
