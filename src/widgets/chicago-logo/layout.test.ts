import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse, type Font } from 'opentype.js'
import { buildTextPath } from '../_shared/text-path'
import { FONT_PATH } from './font'
import { computeLayout, splitLines, type ChicagoLayout } from './layout'
import { PINWHEEL_VIEWBOX, SLASH_VIEWBOX } from './mark-path'

let font: Font

beforeAll(() => {
  const onDisk = resolve(__dirname, '../../../public', FONT_PATH.replace(/^\//, ''))
  const buf = readFileSync(onDisk)
  font = parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
})

// The nav component's reference size: a 36px lockup draws a 29.03px slash.
const H = 36
const MARK_H = 29.03

// Positions below are from the nav component's h = 36 table, in lockup space
// (origin at the lockup's top-left). The layout's origin is the pinwheel's
// left edge and the slash's top, so subtract those.
const PINWHEEL_X = 4.64
const SLASH_TOP = 3.49

function inkOf(layout: ChicagoLayout, lines: string[]) {
  return lines.map((line, i) =>
    buildTextPath(font, line, layout.textOriginX!, layout.baselines[i], layout.fontSize!, layout.letterSpacing!).bbox
  )
}

/** Rendered box of a mark part, from its `translate() scale() translate()` transform. */
function placed(transform: string, vb: { width: number; height: number }) {
  const [x, y, s] = transform.match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number)
  return { x, y, width: vb.width * s, height: vb.height * s }
}

describe('computeLayout — interactive mark', () => {
  it('draws the slash at exactly the requested height', () => {
    const layout = computeLayout(font, 'uptown', 112, 'interactive')
    expect(placed(layout.slashTransform, SLASH_VIEWBOX).height).toBeCloseTo(112, 6)
  })

  it('sizes the pinwheel and slash like the nav component', () => {
    const layout = computeLayout(font, 'uptown', MARK_H, 'interactive')
    const pinwheel = placed(layout.pinwheelTransform, PINWHEEL_VIEWBOX)
    const slash = placed(layout.slashTransform, SLASH_VIEWBOX)
    expect(pinwheel.width).toBeCloseTo(23.85, 1)
    expect(slash.width).toBeCloseTo(9.17, 1)
    expect(slash.height).toBeCloseTo(29.03, 1)
  })

  it('places the slash relative to the pinwheel like the nav component', () => {
    const layout = computeLayout(font, 'uptown', MARK_H, 'interactive')
    const pinwheel = placed(layout.pinwheelTransform, PINWHEEL_VIEWBOX)
    const slash = placed(layout.slashTransform, SLASH_VIEWBOX)
    expect(pinwheel.x).toBeCloseTo(0, 6)
    expect(slash.y).toBeCloseTo(0, 6)
    expect(slash.x).toBeCloseTo(34.13 - PINWHEEL_X, 1)
  })

  it('centres the pinwheel against the slash', () => {
    const layout = computeLayout(font, 'uptown', MARK_H, 'interactive')
    const pinwheel = placed(layout.pinwheelTransform, PINWHEEL_VIEWBOX)
    expect(pinwheel.y + pinwheel.height / 2).toBeCloseTo(MARK_H / 2, 1)
  })
})

describe('computeLayout — single line', () => {
  it('uses the nav type size and tracking', () => {
    const layout = computeLayout(font, 'uptown', MARK_H, 'interactive')
    expect(layout.fontSize).toBeCloseTo(25.92, 1)
    expect(layout.letterSpacing).toBeCloseTo(-0.52, 2)
  })

  it('starts the text box at the name pill padding, not the ink edge', () => {
    const layout = computeLayout(font, 'uptown', MARK_H, 'interactive')
    // mark pill 36 + gap 5.23 + padding-left 6
    expect(layout.textOriginX).toBeCloseTo(36 + 5.23 + 6 - PINWHEEL_X, 1)
  })

  it('centres the line box in the lockup using the font ascender and descender', () => {
    const layout = computeLayout(font, 'uptown', MARK_H, 'interactive')
    const em = layout.fontSize! / font.unitsPerEm
    const content = (font.ascender - font.descender) * em
    const baseline = H / 2 - content / 2 + font.ascender * em
    expect(layout.baselines).toHaveLength(1)
    expect(layout.baselines[0]).toBeCloseTo(baseline - SLASH_TOP, 1)
  })

  it('puts every word on the same baseline, tall first letter or not', () => {
    const base = computeLayout(font, 'uptown', MARK_H, 'interactive').baselines[0]
    for (const text of ['logan square', 'irving park', 'humboldt park']) {
      expect(computeLayout(font, text, MARK_H, 'interactive').baselines[0]).toBeCloseTo(base, 6)
    }
  })

  it('ends the box at the right edge of the text ink', () => {
    const layout = computeLayout(font, 'uptown', 112, 'interactive')
    expect(layout.width).toBeCloseTo(inkOf(layout, ['uptown'])[0].x2, 2)
  })

  it('grows with longer text', () => {
    const short = computeLayout(font, 'uptown', 112, 'interactive')
    const long = computeLayout(font, 'humboldt park', 112, 'interactive')
    expect(long.width).toBeGreaterThan(short.width)
  })
})

describe('computeLayout — two lines', () => {
  it('uses the stacked type size, tracking and line height', () => {
    const layout = computeLayout(font, 'little\nvillage', MARK_H, 'interactive')
    expect(layout.fontSize).toBeCloseTo(14.65, 1)
    expect(layout.letterSpacing).toBeCloseTo(-0.29, 2)
    expect(layout.baselines).toHaveLength(2)
    expect(layout.baselines[1] - layout.baselines[0]).toBeCloseTo(13.92, 1)
  })

  it('centres the two-line block in the lockup', () => {
    const layout = computeLayout(font, 'little\nvillage', MARK_H, 'interactive')
    const em = layout.fontSize! / font.unitsPerEm
    const centreToBaseline = ((font.ascender + font.descender) / 2) * em
    const mid = (layout.baselines[0] + layout.baselines[1]) / 2 - centreToBaseline
    expect(mid).toBeCloseTo(H / 2 - SLASH_TOP, 1)
  })

  it('left-aligns both lines at the same text origin as a single line', () => {
    const single = computeLayout(font, 'uptown', MARK_H, 'interactive')
    const stacked = computeLayout(font, 'little\nvillage', MARK_H, 'interactive')
    expect(stacked.textOriginX).toBeCloseTo(single.textOriginX!, 6)
  })

  it('ends the box at the wider line', () => {
    const layout = computeLayout(font, 'west\nhumboldt park', 112, 'interactive')
    const [a, b] = inkOf(layout, ['west', 'humboldt park'])
    expect(layout.width).toBeCloseTo(Math.max(a.x2, b.x2), 2)
  })

  it('never clips descenders on the second line', () => {
    const layout = computeLayout(font, 'little\nvillage', 112, 'interactive')
    const [, ink] = inkOf(layout, ['little', 'village'])
    expect(layout.viewBoxMinY + layout.height).toBeGreaterThanOrEqual(ink.y2)
  })
})

describe('splitLines', () => {
  it('keeps one or two lines as-is', () => {
    expect(splitLines('uptown')).toEqual(['uptown'])
    expect(splitLines('little\nvillage')).toEqual(['little', 'village'])
  })

  it('folds a third line into the second', () => {
    expect(splitLines('a\nb\nc')).toEqual(['a', 'b c'])
  })
})

describe('computeLayout — empty text', () => {
  it('is the mark alone, ending at the slash', () => {
    const layout = computeLayout(font, '', 112, 'interactive')
    const slash = placed(layout.slashTransform, SLASH_VIEWBOX)
    expect(layout.width).toBeCloseTo(slash.x + slash.width, 6)
    expect(layout.height).toBe(112)
    expect(layout.textPathD).toBeNull()
  })

  it('treats whitespace-only text as empty', () => {
    expect(computeLayout(font, '   ', 112, 'interactive').textPathD).toBeNull()
  })
})

describe('computeLayout — scaling', () => {
  it('scales every dimension linearly with height', () => {
    const base = computeLayout(font, 'little\nvillage', 112, 'interactive')
    const big = computeLayout(font, 'little\nvillage', 336, 'interactive')
    expect(big.width).toBeCloseTo(base.width * 3, 4)
    expect(big.height).toBeCloseTo(base.height * 3, 4)
    expect(big.viewBoxMinY).toBeCloseTo(base.viewBoxMinY * 3, 4)
    expect(big.fontSize!).toBeCloseTo(base.fontSize! * 3, 4)
    expect(big.textOriginX!).toBeCloseTo(base.textOriginX! * 3, 4)
    big.baselines.forEach((y, i) => expect(y).toBeCloseTo(base.baselines[i] * 3, 4))
  })
})

describe('computeLayout — robustness', () => {
  it('produces path data with no NaN', () => {
    const layout = computeLayout(font, 'wicker\npark', 200, 'interactive')
    expect(layout.textPathD).not.toBeNull()
    expect(layout.textPathD!).not.toContain('NaN')
  })

  it('never clips text that reaches past the mark', () => {
    const layout = computeLayout(font, 'ÉÉÉ', 112, 'interactive')
    const [ink] = inkOf(layout, ['ÉÉÉ'])
    expect(ink.y1).toBeGreaterThanOrEqual(layout.viewBoxMinY)
    expect(layout.height).toBeGreaterThanOrEqual(112)
  })

  it('keeps the mark as the box for text without descenders', () => {
    const layout = computeLayout(font, 'uptown'.replace('p', ''), 112, 'interactive')
    expect(layout.viewBoxMinY).toBe(0)
    expect(layout.height).toBe(112)
  })
})

describe('computeLayout — brand spacing', () => {
  // Brand gaps at a 112 mark, from the Figma lockup.
  it('is the default', () => {
    const a = computeLayout(font, 'uptown', 112)
    const b = computeLayout(font, 'uptown', 112, 'brand')
    expect(a.slashTransform).toBe(b.slashTransform)
    expect(a.textOriginX).toBe(b.textOriginX)
  })

  it('uses the tight gap between pinwheel and slash', () => {
    const layout = computeLayout(font, 'uptown', 112, 'brand')
    const pinwheel = placed(layout.pinwheelTransform, PINWHEEL_VIEWBOX)
    const slash = placed(layout.slashTransform, SLASH_VIEWBOX)
    expect(slash.x - (pinwheel.x + pinwheel.width)).toBeCloseTo(12.24, 1)
  })

  it('puts the text ink a fixed gap after the slash, whatever the first letter', () => {
    for (const text of ['uptown', 'wicker park', 'lakeview']) {
      const layout = computeLayout(font, text, 112, 'brand')
      const slash = placed(layout.slashTransform, SLASH_VIEWBOX)
      expect(inkOf(layout, [text])[0].x1 - (slash.x + slash.width), text).toBeCloseTo(9.83, 1)
    }
  })

  it('aligns two lines by the leftmost ink, keeping their shared origin', () => {
    const layout = computeLayout(font, 'little\nvillage', 112, 'brand')
    const slash = placed(layout.slashTransform, SLASH_VIEWBOX)
    const [a, b] = inkOf(layout, ['little', 'village'])
    expect(Math.min(a.x1, b.x1) - (slash.x + slash.width)).toBeCloseTo(9.83, 1)
  })

  it('shares vertical placement and sizing with interactive spacing', () => {
    for (const text of ['uptown', 'little\nvillage']) {
      const brand = computeLayout(font, text, 112, 'brand')
      const interactive = computeLayout(font, text, 112, 'interactive')
      expect(brand.baselines).toEqual(interactive.baselines)
      expect(brand.fontSize).toBe(interactive.fontSize)
      expect(brand.height).toBe(interactive.height)
      expect(placed(brand.slashTransform, SLASH_VIEWBOX).height)
        .toBeCloseTo(placed(interactive.slashTransform, SLASH_VIEWBOX).height, 6)
    }
  })

  it('is narrower than interactive spacing', () => {
    expect(computeLayout(font, 'uptown', 112, 'brand').width)
      .toBeLessThan(computeLayout(font, 'uptown', 112, 'interactive').width)
  })

  it('treats whitespace-only text as empty', () => {
    expect(computeLayout(font, '   ', 112, 'brand').textPathD).toBeNull()
  })
})
