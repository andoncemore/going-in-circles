import type { Font } from 'opentype.js'
import { buildTextPath } from '../_shared/text-path'
import { MARK_NATIVE_WIDTH, MARK_NATIVE_HEIGHT } from './mark-path'

export interface ChicagoLayout {
  width: number
  height: number
  viewBoxMinY: number
  markTransform: string
  textPathD: string | null
  fontSize: number | null
  letterSpacing: number | null
  textOriginX: number | null
  baselineY: number | null
}

// Constants in the mark's native space (mark = 139.979 x 112), taken from the
// chicago.com logo in Figma and confirmed against the rendered mockup:
// font-size 100 with -2% tracking, baseline at y = 81.01, and the text ink
// starting 9.83 to the right of the mark.
const NATIVE_FONT_SIZE = 100
const NATIVE_TRACKING = -0.02 * NATIVE_FONT_SIZE
const NATIVE_GAP = 9.83
const NATIVE_BASELINE_Y = 81.01

/**
 * Lay out `mark + gap + wordmark` at the requested mark height. The width is
 * whatever the text needs — the box ends flush with the text's right ink edge.
 * Every dimension is the native value times `height / 112`, so the result is
 * identical at any size.
 */
export function computeLayout(font: Font, text: string, height: number): ChicagoLayout {
  const scale = height / MARK_NATIVE_HEIGHT
  const markTransform = `scale(${scale})`
  const markW = MARK_NATIVE_WIDTH * scale

  if (text.length === 0) {
    return {
      width: markW,
      height,
      viewBoxMinY: 0,
      markTransform,
      textPathD: null,
      fontSize: null,
      letterSpacing: null,
      textOriginX: null,
      baselineY: null,
    }
  }

  const fontSize = NATIVE_FONT_SIZE * scale
  const letterSpacing = NATIVE_TRACKING * scale
  const baselineY = NATIVE_BASELINE_Y * scale

  // Measure at the origin first so the text can be placed by its ink edge
  // rather than by the leading glyph's side bearing.
  const ref = buildTextPath(font, text, 0, baselineY, fontSize, letterSpacing)
  const inkW = ref.bbox.x2 - ref.bbox.x1

  if (!isFinite(inkW) || inkW <= 0) {
    return {
      width: markW,
      height,
      viewBoxMinY: 0,
      markTransform,
      textPathD: null,
      fontSize: null,
      letterSpacing: null,
      textOriginX: null,
      baselineY: null,
    }
  }

  const textOriginX = markW + NATIVE_GAP * scale - ref.bbox.x1
  const textPathD = buildTextPath(font, text, textOriginX, baselineY, fontSize, letterSpacing).d

  // The mark normally defines the box; only unusually tall or deep glyphs
  // extend it, and then only far enough to avoid clipping them.
  const viewBoxMinY = Math.min(0, ref.bbox.y1)
  const bottom = Math.max(height, ref.bbox.y2)

  return {
    width: textOriginX + ref.bbox.x2,
    height: bottom - viewBoxMinY,
    viewBoxMinY,
    markTransform,
    textPathD,
    fontSize,
    letterSpacing,
    textOriginX,
    baselineY,
  }
}
