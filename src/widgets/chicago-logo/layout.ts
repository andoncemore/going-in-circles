import type { Font } from 'opentype.js'
import { buildTextPath } from '../_shared/text-path'
import { PINWHEEL_VIEWBOX, SLASH_VIEWBOX, type ViewBox } from './mark-path'

/**
 * `brand` is the chicago.com brand lockup from Figma: tight gaps, with the
 * text placed by its ink edge. `interactive` is the nav component, which opens
 * both gaps to make room for hover pills and places text by its advance box.
 * Vertical placement is the same in both.
 */
export type Spacing = 'brand' | 'interactive'

export interface ChicagoLayout {
  width: number
  height: number
  viewBoxMinY: number
  pinwheelTransform: string
  slashTransform: string
  textPathD: string | null
  fontSize: number | null
  letterSpacing: number | null
  textOriginX: number | null
  /** One baseline per line of text, top to bottom. */
  baselines: number[]
}

// Ratios from the chicago.com nav lockup (ChicagoNavLogo). Every value is a
// fraction of h, the lockup height — the height of the hover pills, which is
// taller than the mark. The generator lays everything out in that lockup
// space, then crops the export to the mark's own extents.
const PINWHEEL = { x: 0.129, width: 0.6625, height: 0.7202 } // vertically centred
const SLASH = { x: 0.9481, y: 0.0968, width: 0.2547, height: 0.8065 }
const NAME_X = 0.1452 + 1.0 + 0.1667 // mark pill + gap + name pill padding-left

// Brand gaps, in the mark's native units (slash = 112 tall), from Figma.
const BRAND_MARK_GAP = 12.243 // pinwheel right edge → slash left edge
const BRAND_TEXT_GAP = 9.83 // slash right edge → text ink

const TRACKING = -0.02 // × fontSize
const SINGLE_FONT_SIZE = 0.72
const STACKED_FONT_SIZE = 0.407
const STACKED_LINE_HEIGHT = 0.95 // × fontSize

interface Placed {
  x: number
  y: number
  width: number
  height: number
  scale: number
}

// SVG's default preserveAspectRatio (xMidYMid meet): the artwork keeps its
// aspect ratio, scaled to fit the box and centred in it. The nav component's
// ratios are rounded, so this is what the browser actually draws there.
function fitInBox(vb: ViewBox, x: number, y: number, w: number, h: number): Placed {
  const scale = Math.min(w / vb.width, h / vb.height)
  const width = vb.width * scale
  const height = vb.height * scale
  return { x: x + (w - width) / 2, y: y + (h - height) / 2, width, height, scale }
}

function transformFor(vb: ViewBox, p: Placed, dx: number, dy: number): string {
  return `translate(${p.x + dx} ${p.y + dy}) scale(${p.scale}) translate(${-vb.x} ${-vb.y})`
}

function placeSlash(h: number): Placed {
  return fitInBox(SLASH_VIEWBOX, SLASH.x * h, SLASH.y * h, SLASH.width * h, SLASH.height * h)
}

/** Split into at most two lines — the nav component's stacked variant. */
export function splitLines(text: string): string[] {
  const lines = text.split('\n')
  return lines.length > 2 ? [lines[0], lines.slice(1).join(' ')] : lines
}

/**
 * Lay out the lockup with the mark `height` tall. Sizes and vertical
 * placement follow the nav component: text is centred in the lockup the way
 * CSS centres a line box, using the font's natural ascender and descender.
 * Horizontal gaps follow `spacing`.
 *
 * The box runs from the pinwheel's left edge to the text's right ink edge,
 * and from the top to the bottom of the slash. Glyphs reaching past the mark
 * extend it only far enough to avoid clipping.
 */
export function computeLayout(
  font: Font,
  text: string,
  height: number,
  spacing: Spacing = 'brand'
): ChicagoLayout {
  // Solve for the lockup height whose slash comes out `height` tall.
  const h = height / placeSlash(1).height
  let slash = placeSlash(h)
  const pinwheel = fitInBox(
    PINWHEEL_VIEWBOX,
    PINWHEEL.x * h,
    ((1 - PINWHEEL.height) / 2) * h,
    PINWHEEL.width * h,
    PINWHEEL.height * h
  )

  if (spacing === 'brand') {
    slash = { ...slash, x: pinwheel.x + pinwheel.width + BRAND_MARK_GAP * slash.scale }
  }

  // Shift lockup space so the pinwheel's left edge and the slash top sit at 0.
  const dx = -pinwheel.x
  const dy = -slash.y
  const markOnly: ChicagoLayout = {
    width: slash.x + slash.width + dx,
    height,
    viewBoxMinY: 0,
    pinwheelTransform: transformFor(PINWHEEL_VIEWBOX, pinwheel, dx, dy),
    slashTransform: transformFor(SLASH_VIEWBOX, slash, dx, dy),
    textPathD: null,
    fontSize: null,
    letterSpacing: null,
    textOriginX: null,
    baselines: [],
  }

  const lines = splitLines(text)
  const stacked = lines.length > 1
  const fontSize = (stacked ? STACKED_FONT_SIZE : SINGLE_FONT_SIZE) * h
  const letterSpacing = TRACKING * fontSize
  const em = fontSize / font.unitsPerEm
  // Offset from a line box's centre to its baseline, for the font's natural
  // content area (ascender to descender; descender is negative).
  const centreToBaseline = ((font.ascender + font.descender) / 2) * em
  const lineHeight = stacked ? STACKED_LINE_HEIGHT * fontSize : 0

  // Line i's box centre: the whole block is centred in the lockup.
  const baselines = lines.map(
    (_, i) => h / 2 - (lineHeight * lines.length) / 2 + lineHeight * (i + 0.5) + centreToBaseline + dy
  )

  // Brand text is placed by its leftmost ink, so measure it at the origin
  // first. Both lines share one origin either way, keeping their alignment.
  let textOriginX = NAME_X * h + dx
  if (spacing === 'brand') {
    const inkLeft = Math.min(
      ...lines.map(line => buildTextPath(font, line, 0, 0, fontSize, letterSpacing).bbox.x1).filter(isFinite)
    )
    textOriginX = markOnly.width + BRAND_TEXT_GAP * slash.scale - inkLeft
  }

  let d = ''
  let y1 = 0
  let y2 = height
  let x2 = -Infinity
  lines.forEach((line, i) => {
    const path = buildTextPath(font, line, textOriginX, baselines[i], fontSize, letterSpacing)
    if (!isFinite(path.bbox.x2)) return
    d += path.d
    x2 = Math.max(x2, path.bbox.x2)
    y1 = Math.min(y1, path.bbox.y1)
    y2 = Math.max(y2, path.bbox.y2)
  })

  if (!d) return markOnly

  return {
    ...markOnly,
    width: Math.max(markOnly.width, x2),
    height: y2 - y1,
    viewBoxMinY: y1,
    textPathD: d,
    fontSize,
    letterSpacing,
    textOriginX,
    baselines,
  }
}
