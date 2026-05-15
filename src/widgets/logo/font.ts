import { useEffect, useState } from 'react'
import { load, type Font } from 'opentype.js'

export const FONT_PATH = '/fonts/SantaAna-SemiBold.otf'

let cached: Promise<Font> | null = null

export function loadFont(): Promise<Font> {
  if (!cached) {
    cached = load(FONT_PATH).then(font => {
      patchFont(font)
      return font
    })
  }
  return cached
}

/**
 * opentype.js v2 throws on GSUB lookup type 6 / subtable format 2 (context
 * substitution format 2), which the Santa Ana font's CCMP feature uses.
 * Clearing the affected lookup subtables makes getPath() work without changing
 * glyph shapes — CCMP here only affects optional ligatures we don't use for
 * uppercase Latin text.
 *
 * Idempotent: safe to call multiple times on the same Font.
 */
export function patchFont(font: Font): void {
  const gsub = (font as unknown as {
    tables: {
      gsub?: {
        features: Array<{ tag: string; feature: { lookupListIndexes: number[] } }>
        lookups: Array<{ lookupType: number; subtables: unknown[] }>
      }
    }
  }).tables.gsub
  if (!gsub) return
  for (const featureRecord of gsub.features) {
    if (featureRecord.tag === 'ccmp') {
      for (const idx of featureRecord.feature.lookupListIndexes) {
        const lookup = gsub.lookups[idx]
        if (lookup && lookup.lookupType === 6) {
          lookup.subtables = []
        }
      }
    }
  }
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
