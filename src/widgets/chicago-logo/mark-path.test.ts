import { describe, it, expect } from 'vitest'
import { PINWHEEL_PATHS, PINWHEEL_VIEWBOX, SLASH_PATH, SLASH_VIEWBOX, type ViewBox } from './mark-path'

// Walk absolute path commands (what Figma emits) so H/V single-argument
// commands don't misalign x/y pairing.
const ARITY: Record<string, number> = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, Z: 0 }

function points(d: string): Array<[number, number]> {
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []
  const out: Array<[number, number]> = []
  let cmd = ''
  let i = 0
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) { cmd = tokens[i].toUpperCase(); i++; continue }
    const n = ARITY[cmd]
    if (n === undefined) throw new Error(`unsupported path command: ${cmd}`)
    const args = tokens.slice(i, i + n).map(Number)
    i += n
    if (cmd === 'H') out.push([args[0], NaN])
    else if (cmd === 'V') out.push([NaN, args[0]])
    else for (let k = 0; k < args.length; k += 2) out.push([args[k], args[k + 1]])
  }
  return out
}

function extent(paths: string[]) {
  const xs: number[] = []
  const ys: number[] = []
  for (const d of paths) {
    for (const [x, y] of points(d)) {
      if (!Number.isNaN(x)) xs.push(x)
      if (!Number.isNaN(y)) ys.push(y)
    }
  }
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) }
}

// Control points can overshoot the ink slightly, so allow half a unit.
function expectTightFit(paths: string[], vb: ViewBox) {
  const e = extent(paths)
  expect(e.x1).toBeCloseTo(vb.x, 0)
  expect(e.y1).toBeCloseTo(vb.y, 0)
  expect(Math.abs(e.x2 - (vb.x + vb.width))).toBeLessThan(0.5)
  expect(Math.abs(e.y2 - (vb.y + vb.height))).toBeLessThan(0.5)
}

describe('chicago mark artwork', () => {
  it('is a set of non-empty subpaths with no NaN', () => {
    expect(PINWHEEL_PATHS.length).toBe(5)
    for (const d of [...PINWHEEL_PATHS, SLASH_PATH]) {
      expect(d.startsWith('M')).toBe(true)
      expect(d).not.toContain('NaN')
    }
  })

  it('has a pinwheel viewBox fitted tightly around its artwork', () => {
    expectTightFit(PINWHEEL_PATHS, PINWHEEL_VIEWBOX)
  })

  it('has a slash viewBox fitted tightly around its artwork', () => {
    expectTightFit([SLASH_PATH], SLASH_VIEWBOX)
  })
})
