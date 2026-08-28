import { describe, it, expect } from 'vitest'
import { MARK_PATHS, MARK_NATIVE_WIDTH, MARK_NATIVE_HEIGHT } from './mark-path'

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

describe('chicago mark artwork', () => {
  it('declares the Figma native size', () => {
    expect(MARK_NATIVE_WIDTH).toBeCloseTo(139.979, 3)
    expect(MARK_NATIVE_HEIGHT).toBe(112)
  })

  it('is a set of non-empty subpaths with no NaN', () => {
    expect(MARK_PATHS.length).toBe(6)
    for (const d of MARK_PATHS) {
      expect(d.startsWith('M')).toBe(true)
      expect(d).not.toContain('NaN')
    }
  })

  it('fills its declared box without overflowing it', () => {
    const xs: number[] = []
    const ys: number[] = []
    for (const d of MARK_PATHS) {
      for (const [x, y] of points(d)) {
        if (!Number.isNaN(x)) xs.push(x)
        if (!Number.isNaN(y)) ys.push(y)
      }
    }
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-0.5)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-0.5)
    expect(Math.max(...xs)).toBeLessThanOrEqual(MARK_NATIVE_WIDTH + 0.5)
    expect(Math.max(...ys)).toBeLessThanOrEqual(MARK_NATIVE_HEIGHT + 0.5)
    expect(Math.max(...xs)).toBeGreaterThan(MARK_NATIVE_WIDTH - 1)
    expect(Math.max(...ys)).toBeGreaterThan(MARK_NATIVE_HEIGHT - 1)
  })
})
