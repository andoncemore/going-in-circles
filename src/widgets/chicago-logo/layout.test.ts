import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse, type Font } from 'opentype.js'
import { buildTextPath } from '../_shared/text-path'
import { FONT_PATH } from './font'
import { computeLayout } from './layout'
import { MARK_NATIVE_WIDTH, MARK_NATIVE_HEIGHT } from './mark-path'

let font: Font

beforeAll(() => {
  const onDisk = resolve(__dirname, '../../../public', FONT_PATH.replace(/^\//, ''))
  const buf = readFileSync(onDisk)
  font = parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
})

function textInk(layout: ReturnType<typeof computeLayout>, text: string) {
  return buildTextPath(
    font,
    text,
    layout.textOriginX!,
    layout.baselineY!,
    layout.fontSize!,
    layout.letterSpacing!
  ).bbox
}

describe('computeLayout — empty text', () => {
  it('is the mark alone', () => {
    const layout = computeLayout(font, '', MARK_NATIVE_HEIGHT)
    expect(layout.width).toBeCloseTo(MARK_NATIVE_WIDTH, 3)
    expect(layout.height).toBe(MARK_NATIVE_HEIGHT)
    expect(layout.markTransform).toBe('scale(1)')
    expect(layout.textPathD).toBeNull()
  })
})

describe('computeLayout — Figma proportions at native size', () => {
  // Measured from the Figma mockup: text ink starts at x=150, spans y=17..100,
  // with the mark occupying 0..139.979 x 0..112.
  it('uses font-size 100 and -2% tracking at the native 112 height', () => {
    const layout = computeLayout(font, 'uptown', MARK_NATIVE_HEIGHT)
    expect(layout.fontSize).toBeCloseTo(100, 6)
    expect(layout.letterSpacing).toBeCloseTo(-2, 6)
  })

  it('sets the text ink left edge one gap right of the mark', () => {
    const layout = computeLayout(font, 'uptown', MARK_NATIVE_HEIGHT)
    expect(textInk(layout, 'uptown').x1).toBeCloseTo(149.81, 1)
  })

  it('puts the text ink at the mockup baseline', () => {
    const layout = computeLayout(font, 'uptown', MARK_NATIVE_HEIGHT)
    const ink = textInk(layout, 'uptown')
    expect(layout.baselineY).toBeCloseTo(81.01, 2)
    expect(ink.y1).toBeCloseTo(17.11, 1)
    expect(ink.y2).toBeCloseTo(101.01, 1)
  })

  it('ends the box at the right edge of the text ink', () => {
    const layout = computeLayout(font, 'uptown', MARK_NATIVE_HEIGHT)
    expect(layout.width).toBeCloseTo(textInk(layout, 'uptown').x2, 2)
  })
})

describe('computeLayout — width follows the text', () => {
  it('grows with longer text', () => {
    const short = computeLayout(font, 'uptown', MARK_NATIVE_HEIGHT)
    const long = computeLayout(font, 'humboldt park', MARK_NATIVE_HEIGHT)
    expect(long.width).toBeGreaterThan(short.width)
    expect(long.height).toBe(short.height)
  })

  it('keeps the mark at its native aspect ratio regardless of text', () => {
    const layout = computeLayout(font, 'humboldt park', MARK_NATIVE_HEIGHT)
    expect(layout.markTransform).toBe('scale(1)')
  })
})

describe('computeLayout — scaling', () => {
  it('scales every dimension linearly with height', () => {
    const base = computeLayout(font, 'uptown', MARK_NATIVE_HEIGHT)
    const big = computeLayout(font, 'uptown', MARK_NATIVE_HEIGHT * 3)
    expect(big.width).toBeCloseTo(base.width * 3, 4)
    expect(big.height).toBeCloseTo(base.height * 3, 4)
    expect(big.fontSize!).toBeCloseTo(base.fontSize! * 3, 4)
    expect(big.letterSpacing!).toBeCloseTo(base.letterSpacing! * 3, 4)
    expect(big.baselineY!).toBeCloseTo(base.baselineY! * 3, 4)
    expect(big.textOriginX!).toBeCloseTo(base.textOriginX! * 3, 4)
    expect(big.markTransform).toBe('scale(3)')
  })

  it('scales the rendered ink box linearly too', () => {
    const base = computeLayout(font, 'uptown', MARK_NATIVE_HEIGHT)
    const big = computeLayout(font, 'uptown', MARK_NATIVE_HEIGHT * 3)
    const a = textInk(base, 'uptown')
    const b = textInk(big, 'uptown')
    expect(b.x1).toBeCloseTo(a.x1 * 3, 3)
    expect(b.y1).toBeCloseTo(a.y1 * 3, 3)
    expect(b.x2).toBeCloseTo(a.x2 * 3, 3)
    expect(b.y2).toBeCloseTo(a.y2 * 3, 3)
  })
})

describe('computeLayout — ascender drop', () => {
  // Text starting with a tall letter sits 8px lower at native size, so the
  // wordmark stays optically centred against the mark.
  const NATIVE_BASELINE = 81.01
  const DROP = 8

  it('leaves x-height starts on the mockup baseline', () => {
    expect(computeLayout(font, 'uptown', MARK_NATIVE_HEIGHT).baselineY).toBeCloseTo(NATIVE_BASELINE, 2)
  })

  it('drops starts with an ascender stem', () => {
    expect(computeLayout(font, 'logan square', MARK_NATIVE_HEIGHT).baselineY)
      .toBeCloseTo(NATIVE_BASELINE + DROP, 2)
  })

  it('drops starts with a dotted letter', () => {
    expect(computeLayout(font, 'irving park', MARK_NATIVE_HEIGHT).baselineY)
      .toBeCloseTo(NATIVE_BASELINE + DROP, 2)
  })

  it('applies the drop from the first letter only', () => {
    // 'a' is x-height, even though 'l' and 'b' follow it
    expect(computeLayout(font, 'albany bank', MARK_NATIVE_HEIGHT).baselineY)
      .toBeCloseTo(NATIVE_BASELINE, 2)
  })

  it('scales the drop with the export height', () => {
    const big = computeLayout(font, 'logan square', MARK_NATIVE_HEIGHT * 3)
    expect(big.baselineY).toBeCloseTo((NATIVE_BASELINE + DROP) * 3, 2)
  })

  it('partitions the alphabet and digits exactly', () => {
    const shifted = 'bdfhklijt0123456789'
    const unshifted = 'acegmnopqrsuvwxyz'
    for (const ch of shifted) {
      const layout = computeLayout(font, ch, MARK_NATIVE_HEIGHT)
      expect(layout.baselineY, `"${ch}" should drop`).toBeCloseTo(NATIVE_BASELINE + DROP, 2)
    }
    for (const ch of unshifted) {
      const layout = computeLayout(font, ch, MARK_NATIVE_HEIGHT)
      expect(layout.baselineY, `"${ch}" should not drop`).toBeCloseTo(NATIVE_BASELINE, 2)
    }
  })

  it('keeps dropped descenders inside the mark box', () => {
    const layout = computeLayout(font, 'humboldt park', MARK_NATIVE_HEIGHT)
    const ink = textInk(layout, 'humboldt park')
    expect(ink.y2).toBeLessThanOrEqual(MARK_NATIVE_HEIGHT)
    expect(layout.height).toBe(MARK_NATIVE_HEIGHT)
  })
})

describe('computeLayout — robustness', () => {
  it('produces path data with no NaN', () => {
    const layout = computeLayout(font, 'wicker park', 200)
    expect(layout.textPathD).not.toBeNull()
    expect(layout.textPathD!).not.toContain('NaN')
  })

  it('never clips text that reaches past the mark box', () => {
    const layout = computeLayout(font, 'ÉÉÉ', MARK_NATIVE_HEIGHT)
    const ink = textInk(layout, 'ÉÉÉ')
    expect(ink.y1).toBeGreaterThanOrEqual(layout.viewBoxMinY)
    expect(layout.height).toBeGreaterThanOrEqual(MARK_NATIVE_HEIGHT)
  })

  it('keeps the mark box as the viewBox for ordinary lowercase text', () => {
    const layout = computeLayout(font, 'uptown', MARK_NATIVE_HEIGHT)
    expect(layout.viewBoxMinY).toBe(0)
    expect(layout.height).toBe(MARK_NATIVE_HEIGHT)
  })
})
