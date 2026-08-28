import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MARK_PATHS } from './mark-path'

// Synthetic font matching the shape buildTextPath reads: unitsPerEm,
// charToGlyph → glyph.path.commands (raw font-space coords) + advanceWidth.
const UNITS_PER_EM = 1000
const ADVANCE = 500
const fakeGlyph = {
  advanceWidth: ADVANCE,
  path: {
    commands: [
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: ADVANCE, y: 0 },
      { type: 'L', x: ADVANCE, y: 700 },
      { type: 'L', x: 0, y: 700 },
      { type: 'Z' },
    ],
  },
}
const fakeFont = {
  unitsPerEm: UNITS_PER_EM,
  charToGlyph: vi.fn(() => fakeGlyph),
}

vi.mock('./font', () => ({
  FONT_PATH: '/fonts/Tempo-Bold-Custom.otf',
  loadFont: vi.fn(() => Promise.resolve(fakeFont)),
  useFont: () => ({ status: 'ready', font: fakeFont }),
}))

vi.mock('../_shared/export', () => ({
  serializeSvg: vi.fn(() => '<svg/>'),
  rasterizeToPng: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
  downloadBlob: vi.fn(),
  slugify: (s: string, fallback = 'logo') => s.toLowerCase().replace(/\s+/g, '-') || fallback,
}))

import ChicagoLogoWidget from './index'
import * as exportModule from '../_shared/export'

function renderWidget() {
  return render(
    <MemoryRouter>
      <ChicagoLogoWidget />
    </MemoryRouter>
  )
}

const markPaths = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('svg path')).slice(0, MARK_PATHS.length)
const textPath = (container: HTMLElement) =>
  container.querySelectorAll('svg path')[MARK_PATHS.length] ?? null

describe('ChicagoLogoWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the neighborhood name and export height inputs', () => {
    renderWidget()
    expect(screen.getByLabelText(/neighborhood name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/export height/i)).toBeInTheDocument()
  })

  it('lowercases typed text', () => {
    renderWidget()
    const input = screen.getByLabelText(/neighborhood name/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Hyde Park' } })
    expect(input.value).toBe('hyde park')
  })

  it('disables export buttons when text is empty', () => {
    renderWidget()
    expect(screen.getByRole('button', { name: /download svg/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled()
  })

  it('enables export buttons once text is entered', () => {
    renderWidget()
    fireEvent.change(screen.getByLabelText(/neighborhood name/i), { target: { value: 'uptown' } })
    expect(screen.getByRole('button', { name: /download svg/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /download png/i })).not.toBeDisabled()
  })

  it('renders the mark alone when text is empty', () => {
    const { container } = renderWidget()
    expect(container.querySelectorAll('svg path').length).toBe(MARK_PATHS.length)
  })

  it('adds one text path when text is entered', () => {
    const { container } = renderWidget()
    fireEvent.change(screen.getByLabelText(/neighborhood name/i), { target: { value: 'uptown' } })
    expect(container.querySelectorAll('svg path').length).toBe(MARK_PATHS.length + 1)
    expect(container.querySelector('svg text')).toBeNull()
  })

  it('defaults to a magenta mark and black wordmark', () => {
    const { container } = renderWidget()
    fireEvent.change(screen.getByLabelText(/neighborhood name/i), { target: { value: 'uptown' } })
    for (const p of markPaths(container)) {
      expect(p.getAttribute('fill')).toBe('#BE189E')
    }
    expect(textPath(container)!.getAttribute('fill')).toBe('#000000')
  })

  it('recolors only the mark when a mark color is picked', () => {
    const { container } = renderWidget()
    fireEvent.change(screen.getByLabelText(/neighborhood name/i), { target: { value: 'uptown' } })
    const group = screen.getByRole('radiogroup', { name: /mark color/i })
    fireEvent.click(within(group).getByRole('radio', { name: /blue/i }))
    for (const p of markPaths(container)) {
      expect(p.getAttribute('fill')).toBe('#1966FF')
    }
    expect(textPath(container)!.getAttribute('fill')).toBe('#000000')
  })

  it('recolors only the wordmark when a text color is picked', () => {
    const { container } = renderWidget()
    fireEvent.change(screen.getByLabelText(/neighborhood name/i), { target: { value: 'uptown' } })
    const group = screen.getByRole('radiogroup', { name: /text color/i })
    fireEvent.click(within(group).getByRole('radio', { name: /white/i }))
    expect(textPath(container)!.getAttribute('fill')).toBe('#FFFFFF')
    expect(markPaths(container)[0].getAttribute('fill')).toBe('#BE189E')
  })

  it('shows the computed export width, which grows with longer text', () => {
    renderWidget()
    const input = screen.getByLabelText(/neighborhood name/i)
    fireEvent.change(input, { target: { value: 'uptown' } })
    const short = Number(screen.getByTestId('computed-width').textContent!.replace(/\D/g, ''))
    fireEvent.change(input, { target: { value: 'humboldt park' } })
    const long = Number(screen.getByTestId('computed-width').textContent!.replace(/\D/g, ''))
    expect(short).toBeGreaterThan(0)
    expect(long).toBeGreaterThan(short)
  })

  it('scales the preview svg with the export height', () => {
    const { container } = renderWidget()
    fireEvent.change(screen.getByLabelText(/neighborhood name/i), { target: { value: 'uptown' } })
    const svg = container.querySelector('svg')!
    const baseW = Number(svg.getAttribute('width'))
    fireEvent.change(screen.getByLabelText(/export height/i), { target: { value: '224' } })
    expect(Number(svg.getAttribute('height'))).toBe(224)
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(baseW * 2, 4)
  })

  it('downloads an SVG named after the text', () => {
    renderWidget()
    fireEvent.change(screen.getByLabelText(/neighborhood name/i), { target: { value: 'uptown' } })
    fireEvent.click(screen.getByRole('button', { name: /download svg/i }))
    expect(exportModule.serializeSvg).toHaveBeenCalled()
    expect(exportModule.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'chicago-uptown.svg')
  })

  it('downloads a PNG named after the text', async () => {
    renderWidget()
    fireEvent.change(screen.getByLabelText(/neighborhood name/i), { target: { value: 'uptown' } })
    fireEvent.click(screen.getByRole('button', { name: /download png/i }))
    await waitFor(() => {
      expect(exportModule.rasterizeToPng).toHaveBeenCalled()
      expect(exportModule.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'chicago-uptown.png')
    })
  })
})
