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

export interface TextPath {
  d: string
  bbox: { x1: number; y1: number; x2: number; y2: number }
}

const NATIVE_GAP = 15
const REF_FONT_SIZE = 100

interface RawCmd {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z'
  x?: number
  y?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

interface InternalGlyph {
  path: { commands: RawCmd[] }
  advanceWidth?: number
}

function fmt(n: number): string {
  const r = Math.round(n * 100) / 100
  return r.toString()
}

/**
 * Build the SVG path `d` string and ink bounding box for `text` at the given
 * origin and fontSize. Iterates raw glyph commands directly and applies the
 * font-space → output-space transform ourselves. This avoids opentype.js v2's
 * `Font.getPath` / `Glyph.getPath` / `Path.toPathData` pipeline, which produces
 * NaN coordinates on certain commands for the Santa Ana font (root cause not
 * fully isolated; the raw glyph data itself is clean).
 *
 * The y-axis is flipped: font space has y increasing upward, SVG has y
 * increasing downward. We apply `outputY = originY - cmdY * scale`.
 *
 * The bounding box covers all endpoints AND Bezier control points. This
 * slightly overestimates the true ink width on tight curves, but the resulting
 * scale error for typical Latin uppercase glyphs is sub-pixel.
 */
export function buildTextPath(font: Font, text: string, x: number, y: number, fontSize: number): TextPath {
  const scale = fontSize / font.unitsPerEm
  let cursor = x
  let d = ''
  let x1Min = Infinity, y1Min = Infinity, x2Max = -Infinity, y2Max = -Infinity

  function add(px: number, py: number) {
    if (px < x1Min) x1Min = px
    if (px > x2Max) x2Max = px
    if (py < y1Min) y1Min = py
    if (py > y2Max) y2Max = py
  }

  for (const ch of Array.from(text)) {
    const glyph = font.charToGlyph(ch) as unknown as InternalGlyph
    const cmds = glyph.path?.commands ?? []
    for (const cmd of cmds) {
      switch (cmd.type) {
        case 'M': {
          const px = cursor + (cmd.x ?? 0) * scale
          const py = y - (cmd.y ?? 0) * scale
          d += `M${fmt(px)} ${fmt(py)}`
          add(px, py)
          break
        }
        case 'L': {
          const px = cursor + (cmd.x ?? 0) * scale
          const py = y - (cmd.y ?? 0) * scale
          d += `L${fmt(px)} ${fmt(py)}`
          add(px, py)
          break
        }
        case 'C': {
          const cx1 = cursor + (cmd.x1 ?? 0) * scale
          const cy1 = y - (cmd.y1 ?? 0) * scale
          const cx2 = cursor + (cmd.x2 ?? 0) * scale
          const cy2 = y - (cmd.y2 ?? 0) * scale
          const px = cursor + (cmd.x ?? 0) * scale
          const py = y - (cmd.y ?? 0) * scale
          d += `C${fmt(cx1)} ${fmt(cy1)} ${fmt(cx2)} ${fmt(cy2)} ${fmt(px)} ${fmt(py)}`
          add(cx1, cy1); add(cx2, cy2); add(px, py)
          break
        }
        case 'Q': {
          const cx1 = cursor + (cmd.x1 ?? 0) * scale
          const cy1 = y - (cmd.y1 ?? 0) * scale
          const px = cursor + (cmd.x ?? 0) * scale
          const py = y - (cmd.y ?? 0) * scale
          d += `Q${fmt(cx1)} ${fmt(cy1)} ${fmt(px)} ${fmt(py)}`
          add(cx1, cy1); add(px, py)
          break
        }
        case 'Z':
          d += 'Z'
          break
      }
    }
    cursor += (glyph.advanceWidth ?? 0) * scale
  }

  const bbox = x1Min === Infinity
    ? { x1: NaN, y1: NaN, x2: NaN, y2: NaN }
    : { x1: x1Min, y1: y1Min, x2: x2Max, y2: y2Max }
  return { d, bbox }
}

export function computeLayout(font: Font, text: string, width: number): Layout {
  const topScale = width / ROUNDABOUT_NATIVE_WIDTH
  const topH = ROUNDABOUT_NATIVE_HEIGHT * topScale
  const gap = NATIVE_GAP * topScale
  const topTransform = `scale(${topScale})`

  if (text.length === 0) {
    return { width, height: topH, topTransform, textPathD: null, fontSize: null, textOriginX: null, textOriginY: null }
  }

  const ref = buildTextPath(font, text, 0, 0, REF_FONT_SIZE)
  const inkW = ref.bbox.x2 - ref.bbox.x1

  if (!isFinite(inkW) || inkW <= 0) {
    return { width, height: topH, topTransform, textPathD: null, fontSize: null, textOriginX: null, textOriginY: null }
  }

  const inkLeft = ref.bbox.x1
  const ascent = -ref.bbox.y1
  const descent = ref.bbox.y2

  const s = width / inkW
  const fontSize = REF_FONT_SIZE * s
  const textOriginX = -inkLeft * s
  const textOriginY = topH + gap + ascent * s
  const height = topH + gap + (ascent + descent) * s

  const textPathD = buildTextPath(font, text, textOriginX, textOriginY, fontSize).d

  return { width, height, topTransform, textPathD, fontSize, textOriginX, textOriginY }
}
