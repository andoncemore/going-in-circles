import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SANTA_ANA = '/fonts/SantaAna-SemiBold.otf'
const TEMPO = '/fonts/Tempo-Bold-Custom.otf'

function bytesFor(fontPath: string): ArrayBuffer {
  const buf = readFileSync(resolve(__dirname, '../../../public', fontPath.replace(/^\//, '')))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules()
  fetchMock = vi.fn((url: string) =>
    Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(bytesFor(url)) })
  )
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadFont', () => {
  it('parses the font at the given path', async () => {
    const { loadFont } = await import('./font')
    const font = await loadFont(TEMPO)
    expect(font.unitsPerEm).toBe(1000)
    expect(fetchMock).toHaveBeenCalledWith(TEMPO)
  })

  it('fetches each path only once', async () => {
    const { loadFont } = await import('./font')
    await loadFont(TEMPO)
    await loadFont(TEMPO)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('caches per path, so a second font still loads', async () => {
    const { loadFont } = await import('./font')
    await loadFont(TEMPO)
    await loadFont(SANTA_ANA)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith(SANTA_ANA)
  })

  it('rejects with status text when the fetch fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })
    const { loadFont } = await import('./font')
    await expect(loadFont(TEMPO)).rejects.toThrow(/404 Not Found/)
  })
})
