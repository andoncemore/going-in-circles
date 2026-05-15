import { Path, type Font } from 'opentype.js'
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
 * Build a Path for `text` by mapping each character directly to a glyph via
 * `charToGlyph` and concatenating their paths with kerning. This bypasses
 * `Font.getPath`, which routes through GSUB/CCMP shaping — that pipeline
 * produces invalid path data on the Santa Ana font due to opentype.js v2's
 * partial GSUB lookup-type-6 support.
 */
export function buildTextPath(font: Font, text: string, x: number, y: number, fontSize: number): Path {
  const scale = fontSize / font.unitsPerEm
  const result = new Path()
  let cursor = x
  const glyphs = Array.from(text).map(ch => font.charToGlyph(ch))

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i]
    result.extend(glyph.getPath(cursor, y, fontSize))
    cursor += (glyph.advanceWidth ?? 0) * scale
    if (i < glyphs.length - 1) {
      cursor += font.getKerningValue(glyph, glyphs[i + 1]) * scale
    }
  }
  return result
}

export function computeLayout(font: Font, text: string, width: number): Layout {
  const topScale = width / ROUNDABOUT_NATIVE_WIDTH
  const topH = ROUNDABOUT_NATIVE_HEIGHT * topScale
  const gap = NATIVE_GAP * topScale
  const topTransform = `scale(${topScale})`

  if (text.length === 0) {
    return { width, height: topH, topTransform, textPathD: null, fontSize: null, textOriginX: null, textOriginY: null }
  }

  const refPath = buildTextPath(font, text, 0, 0, REF_FONT_SIZE)
  const bb = refPath.getBoundingBox()
  const inkW = bb.x2 - bb.x1

  // Defensive guard: a degenerate or empty bbox (e.g., whitespace-only text or
  // missing glyphs) yields a non-finite scale. Render top section only.
  if (!isFinite(inkW) || inkW <= 0) {
    return { width, height: topH, topTransform, textPathD: null, fontSize: null, textOriginX: null, textOriginY: null }
  }

  const inkLeft = bb.x1
  const ascent = -bb.y1
  const descent = bb.y2

  const s = width / inkW
  const fontSize = REF_FONT_SIZE * s
  const textOriginX = -inkLeft * s
  const textOriginY = topH + gap + ascent * s
  const height = topH + gap + (ascent + descent) * s

  const textPathD = buildTextPath(font, text, textOriginX, textOriginY, fontSize).toPathData(2)

  return { width, height, topTransform, textPathD, fontSize, textOriginX, textOriginY }
}
