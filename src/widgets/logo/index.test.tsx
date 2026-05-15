import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Build a synthetic "font" matching the shape buildTextPath reads: unitsPerEm,
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
  FONT_PATH: '/fonts/SantaAna-SemiBold.otf',
  loadFont: vi.fn(() => Promise.resolve(fakeFont)),
  useFont: () => ({ status: 'ready', font: fakeFont }),
}))

vi.mock('./export', () => ({
  serializeSvg: vi.fn(() => '<svg/>'),
  rasterizeToPng: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
  downloadBlob: vi.fn(),
  slugify: (s: string) => s.toLowerCase() || 'roundabout',
}))

import LogoWidget from './index'
import * as exportModule from './export'

function renderWidget() {
  return render(
    <MemoryRouter>
      <LogoWidget />
    </MemoryRouter>
  )
}

describe('LogoWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the location name and width inputs', () => {
    renderWidget()
    expect(screen.getByLabelText(/location name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/width/i)).toBeInTheDocument()
  })

  it('uppercases typed location text', () => {
    renderWidget()
    const input = screen.getByLabelText(/location name/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'brooklyn' } })
    expect(input.value).toBe('BROOKLYN')
  })

  it('disables export buttons when text is empty', () => {
    renderWidget()
    expect(screen.getByRole('button', { name: /download svg/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled()
  })

  it('enables export buttons after text is entered', () => {
    renderWidget()
    fireEvent.change(screen.getByLabelText(/location name/i), { target: { value: 'LA' } })
    expect(screen.getByRole('button', { name: /download svg/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /download png/i })).not.toBeDisabled()
  })

  it('renders an inline preview svg with two paths when text is non-empty', () => {
    const { container } = renderWidget()
    fireEvent.change(screen.getByLabelText(/location name/i), { target: { value: 'LA' } })
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.querySelectorAll('path').length).toBe(2)
    expect(svg!.querySelector('text')).toBeNull()
  })

  it('renders only the top section (one path) when text is empty', () => {
    const { container } = renderWidget()
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.querySelectorAll('path').length).toBe(1)
  })

  it('calls serializeSvg + downloadBlob when SVG download is clicked', () => {
    renderWidget()
    fireEvent.change(screen.getByLabelText(/location name/i), { target: { value: 'LA' } })
    fireEvent.click(screen.getByRole('button', { name: /download svg/i }))
    expect(exportModule.serializeSvg).toHaveBeenCalled()
    expect(exportModule.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'roundabout-la.svg')
  })

  it('calls rasterizeToPng + downloadBlob when PNG download is clicked', async () => {
    renderWidget()
    fireEvent.change(screen.getByLabelText(/location name/i), { target: { value: 'LA' } })
    fireEvent.click(screen.getByRole('button', { name: /download png/i }))
    await waitFor(() => {
      expect(exportModule.rasterizeToPng).toHaveBeenCalled()
      expect(exportModule.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'roundabout-la.png')
    })
  })
})
