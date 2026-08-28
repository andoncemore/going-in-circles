import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse, type Font } from 'opentype.js'
import { buildTextPath } from './text-path'

let font: Font

beforeAll(() => {
  const onDisk = resolve(__dirname, '../../../public/fonts/SantaAna-SemiBold.otf')
  const buf = readFileSync(onDisk)
  font = parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
})

const inkWidth = (tp: { bbox: { x1: number; x2: number } }) => tp.bbox.x2 - tp.bbox.x1

describe('buildTextPath letter spacing', () => {
  it('defaults to no tracking', () => {
    const implicit = buildTextPath(font, 'BROOKLYN', 0, 0, 100)
    const explicit = buildTextPath(font, 'BROOKLYN', 0, 0, 100, 0)
    expect(implicit.d).toBe(explicit.d)
  })

  it('applies tracking between glyphs but not after the last one', () => {
    const plain = buildTextPath(font, 'BROOKLYN', 0, 0, 100)
    const tracked = buildTextPath(font, 'BROOKLYN', 0, 0, 100, -2)
    // 8 glyphs → 7 gaps
    expect(inkWidth(tracked)).toBeCloseTo(inkWidth(plain) - 14, 4)
  })

  it('leaves a single glyph unaffected by tracking', () => {
    const plain = buildTextPath(font, 'B', 0, 0, 100)
    const tracked = buildTextPath(font, 'B', 0, 0, 100, -2)
    expect(tracked.d).toBe(plain.d)
  })
})
