import type { Font } from 'opentype.js'

export interface TextPath {
  d: string
  bbox: { x1: number; y1: number; x2: number; y2: number }
}

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
 * `letterSpacing` is extra advance in output units inserted *between* glyphs
 * (never after the last one), so tracking does not pad the ink box.
 *
 * The bounding box covers all endpoints AND Bezier control points. This
 * slightly overestimates the true ink width on tight curves, but the resulting
 * scale error for typical Latin glyphs is sub-pixel.
 */
export function buildTextPath(
  font: Font,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  letterSpacing = 0
): TextPath {
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

  const chars = Array.from(text)
  chars.forEach((ch, i) => {
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
    if (i < chars.length - 1) cursor += letterSpacing
  })

  const bbox = x1Min === Infinity
    ? { x1: NaN, y1: NaN, x2: NaN, y2: NaN }
    : { x1: x1Min, y1: y1Min, x2: x2Max, y2: y2Max }
  return { d, bbox }
}
