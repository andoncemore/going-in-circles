import { useState, useRef, useMemo } from 'react'
import WidgetLayout from '../../components/WidgetLayout'
import { serializeSvg, rasterizeToPng, downloadBlob, slugify } from '../_shared/export'
import { useFont } from './font'
import { computeLayout } from './layout'
import { MARK_PATHS } from './mark-path'
import styles from './styles.module.css'

const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Magenta', hex: '#BE189E' },
  { name: 'Blue', hex: '#1966FF' },
]

const DEFAULT_HEIGHT = 112

interface SwatchRowProps {
  label: string
  value: string
  onChange: (hex: string) => void
}

function SwatchRow({ label, value, onChange }: SwatchRowProps) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.swatchRow} role="radiogroup" aria-label={label}>
        {COLORS.map(c => (
          <button
            key={c.hex}
            type="button"
            role="radio"
            aria-checked={value === c.hex}
            aria-label={c.name}
            title={c.name}
            className={`${styles.swatch} ${value === c.hex ? styles.swatchSelected : ''}`}
            style={{ background: c.hex }}
            onClick={() => onChange(c.hex)}
          />
        ))}
      </div>
    </div>
  )
}

export default function ChicagoLogoWidget() {
  const [text, setText] = useState('')
  const [markColor, setMarkColor] = useState('#BE189E')
  const [textColor, setTextColor] = useState('#1966FF')
  const [exportHeight, setExportHeight] = useState(DEFAULT_HEIGHT)
  const fontState = useFont()

  const ready = fontState.status === 'ready'
  const canExport = ready && text.length > 0

  const svgRef = useRef<SVGSVGElement>(null)
  const layout = useMemo(
    () => (fontState.status === 'ready' ? computeLayout(fontState.font, text, exportHeight) : null),
    [fontState, text, exportHeight]
  )

  const [pngError, setPngError] = useState<string | null>(null)

  function handleDownloadSvg() {
    if (!svgRef.current) return
    const svgString = serializeSvg(svgRef.current)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    downloadBlob(blob, `chicago-${slugify(text, 'chicago')}.svg`)
  }

  async function handleDownloadPng() {
    if (!svgRef.current || !layout) return
    setPngError(null)
    try {
      const svgString = serializeSvg(svgRef.current)
      const blob = await rasterizeToPng(svgString, layout.width, layout.height)
      downloadBlob(blob, `chicago-${slugify(text, 'chicago')}.png`)
    } catch (e) {
      setPngError(String(e instanceof Error ? e.message : e))
    }
  }

  const sidebar = (
    <div className={styles.sidebarInner}>
      <h2 className={styles.title}>Chicago Logo Generator</h2>
      <p className={styles.description}>Type a neighborhood, then download as SVG or PNG.</p>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="chicago-text">Neighborhood name</label>
        <input
          id="chicago-text"
          className={styles.input}
          placeholder="uptown"
          value={text}
          onChange={e => setText(e.target.value.toLowerCase())}
        />
      </div>

      <SwatchRow label="Mark color" value={markColor} onChange={setMarkColor} />
      <SwatchRow label="Text color" value={textColor} onChange={setTextColor} />

      <div className={styles.spacer} />

      {fontState.status === 'loading' && <p className={styles.status}>Loading font…</p>}
      {fontState.status === 'error' && (
        <p className={styles.statusError}>Font failed to load: {fontState.error}</p>
      )}
      {pngError && <p className={styles.statusError}>PNG export failed: {pngError}</p>}

      <div className={styles.actions}>
        <div className={styles.exportField}>
          <label className={styles.fieldLabel} htmlFor="chicago-export-height">Export height (px)</label>
          <input
            id="chicago-export-height"
            className={styles.input}
            type="number"
            min={20}
            max={4000}
            value={exportHeight}
            onChange={e => setExportHeight(Number(e.target.value) || 0)}
            onBlur={() => setExportHeight(h => Math.max(20, Math.min(4000, h || DEFAULT_HEIGHT)))}
          />
          <span className={styles.computedWidth} data-testid="computed-width">
            Width: {layout ? Math.round(layout.width) : 0} px (set by the text)
          </span>
        </div>
        <button
          className={styles.primaryBtn}
          disabled={!canExport}
          onClick={handleDownloadSvg}
        >
          Download SVG
        </button>
        <button
          className={styles.downloadBtn}
          disabled={!canExport}
          onClick={handleDownloadPng}
        >
          Download PNG
        </button>
      </div>
    </div>
  )

  const main = (
    <div className={styles.previewWrap}>
      {!ready && <span className={styles.placeholder}>Waiting for font…</span>}
      {ready && layout && (
        <svg
          ref={svgRef}
          className={styles.previewSvg}
          width={layout.width}
          height={layout.height}
          viewBox={`0 ${layout.viewBoxMinY} ${layout.width} ${layout.height}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform={layout.markTransform}>
            {MARK_PATHS.map((d, i) => (
              <path key={i} d={d} fill={markColor} />
            ))}
          </g>
          {layout.textPathD && <path d={layout.textPathD} fill={textColor} />}
        </svg>
      )}
    </div>
  )

  return <WidgetLayout sidebar={sidebar} main={main} />
}
