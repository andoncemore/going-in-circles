import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse, type Font } from 'opentype.js'
import { FONT_PATH } from './font'
import { computeLayout, buildTextPath } from './layout'

let font: Font

beforeAll(() => {
  // FONT_PATH is "/fonts/SantaAna-SemiBold.otf" (browser URL); on disk it lives under public/.
  const onDisk = resolve(__dirname, '../../../public', FONT_PATH.replace(/^\//, ''))
  const buf = readFileSync(onDisk)
  font = parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
})

describe('computeLayout — empty text', () => {
  it('returns top-only layout (no textPathD) when text is empty', () => {
    const layout = computeLayout(font, '', 320)
    expect(layout.width).toBe(320)
    expect(layout.textPathD).toBeNull()
    // topH at width=320 is exactly 42 (native)
    expect(layout.height).toBeCloseTo(42, 5)
    expect(layout.topTransform).toBe('scale(1)')
  })
})

describe('computeLayout — non-empty text', () => {
  it('scales font size so glyph ink width equals target width', () => {
    const layout = computeLayout(font, 'BROOKLYN', 320)
    expect(layout.textPathD).not.toBeNull()
    expect(layout.fontSize).toBeDefined()
    const p = buildTextPath(font, 'BROOKLYN', layout.textOriginX!, layout.textOriginY!, layout.fontSize!)
    const bb = p.getBoundingBox()
    expect(bb.x2 - bb.x1).toBeCloseTo(320, 1)
  })

  it('positions text so the left ink edge sits at x = 0', () => {
    const layout = computeLayout(font, 'BROOKLYN', 320)
    const p = buildTextPath(font, 'BROOKLYN', layout.textOriginX!, layout.textOriginY!, layout.fontSize!)
    const bb = p.getBoundingBox()
    expect(bb.x1).toBeCloseTo(0, 1)
  })

  it('scales linearly: doubling width doubles font size', () => {
    const a = computeLayout(font, 'BROOKLYN', 320)
    const b = computeLayout(font, 'BROOKLYN', 640)
    expect(b.fontSize!).toBeCloseTo(a.fontSize! * 2, 1)
  })

  it('height = topH + gap + (ascent + descent) * scale', () => {
    const layout = computeLayout(font, 'BROOKLYN', 320)
    const ref = buildTextPath(font, 'BROOKLYN', 0, 0, 100)
    const bb = ref.getBoundingBox()
    const inkW = bb.x2 - bb.x1
    const s = 320 / inkW
    const expectedHeight = 42 + 15 + (-bb.y1 + bb.y2) * s
    expect(layout.height).toBeCloseTo(expectedHeight, 2)
  })
})
