import type { Font } from 'opentype.js'
import { ROUNDABOUT_NATIVE_WIDTH, ROUNDABOUT_NATIVE_HEIGHT } from './roundabout-path'

export interface Layout {
  width: number
  height: number
  topTransform: string
  textPathD: string | null
  fontSize: number | null
  textOriginX: number | null
  textOriginY: number | null
}

const NATIVE_GAP = 15
const REF_FONT_SIZE = 100

/**
 * opentype.js v2 does not support GSUB lookup type 6 / subtable format 2
 * (context substitution format 2). The Santa Ana font uses this in its CCMP
 * feature. Clearing the subtables of affected lookups makes getPath() work
 * without changing any glyph shapes — CCMP in this font is a presentational
 * ligature feature we don't need for bounding-box math.
 *
 * This function is idempotent: calling it more than once on the same font is safe.
 */
export function patchFont(font: Font): void {
  const gsub = (font as unknown as { tables: { gsub?: { features: Array<{ tag: string; feature: { lookupListIndexes: number[] } }>; lookups: Array<{ lookupType: number; subtables: unknown[] }> } } }).tables.gsub
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

export function computeLayout(font: Font, text: string, width: number): Layout {
  patchFont(font)

  const topScale = width / ROUNDABOUT_NATIVE_WIDTH
  const topH = ROUNDABOUT_NATIVE_HEIGHT * topScale
  const gap = NATIVE_GAP * topScale
  const topTransform = `scale(${topScale})`

  if (text.length === 0) {
    return { width, height: topH, topTransform, textPathD: null, fontSize: null, textOriginX: null, textOriginY: null }
  }

  const refPath = font.getPath(text, 0, 0, REF_FONT_SIZE)
  const bb = refPath.getBoundingBox()
  const inkW = bb.x2 - bb.x1
  const inkLeft = bb.x1
  const ascent = -bb.y1
  const descent = bb.y2

  const s = width / inkW
  const fontSize = REF_FONT_SIZE * s
  const textOriginX = -inkLeft * s
  const textOriginY = topH + gap + ascent * s
  const height = topH + gap + (ascent + descent) * s

  const textPathD = font.getPath(text, textOriginX, textOriginY, fontSize).toPathData(2)

  return { width, height, topTransform, textPathD, fontSize, textOriginX, textOriginY }
}
