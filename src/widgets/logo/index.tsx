import { useState, useRef, useMemo } from 'react'
import WidgetLayout from '../../components/WidgetLayout'
import { useFont } from './font'
import { computeLayout } from './layout'
import { ROUNDABOUT_PATH } from './roundabout-path'
import { serializeSvg, rasterizeToPng, downloadBlob, slugify } from './export'
import styles from './styles.module.css'

export default function LogoWidget() {
  const [text, setText] = useState('')
  const [width, setWidth] = useState(320)
  const fontState = useFont()

  const ready = fontState.status === 'ready'
  const canExport = ready && text.length > 0

  const svgRef = useRef<SVGSVGElement>(null)
  const layout = useMemo(
    () => (fontState.status === 'ready' ? computeLayout(fontState.font, text, width) : null),
    [fontState, text, width]
  )

  const [pngError, setPngError] = useState<string | null>(null)

  function handleDownloadSvg() {
    if (!svgRef.current) return
    const svgString = serializeSvg(svgRef.current)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    downloadBlob(blob, `roundabout-${slugify(text)}.svg`)
  }

  async function handleDownloadPng() {
    if (!svgRef.current || !layout) return
    setPngError(null)
    try {
      const svgString = serializeSvg(svgRef.current)
      const blob = await rasterizeToPng(svgString, layout.width, layout.height)
      downloadBlob(blob, `roundabout-${slugify(text)}.png`)
    } catch (e) {
      setPngError(String(e instanceof Error ? e.message : e))
    }
  }

  const sidebar = (
    <div className={styles.sidebarInner}>
      <h2 className={styles.title}>Roundabout Logo Generator</h2>
      <p className={styles.description}>Type a location, set a width, download SVG or PNG.</p>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="logo-text">Location name</label>
        <input
          id="logo-text"
          className={styles.input}
          placeholder="BROOKLYN"
          value={text}
          onChange={e => setText(e.target.value.toUpperCase())}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="logo-width">Width (px)</label>
        <input
          id="logo-width"
          className={styles.input}
          type="number"
          min={100}
          max={2000}
          value={width}
          onChange={e => setWidth(Number(e.target.value) || 0)}
          onBlur={() => setWidth(w => Math.max(100, Math.min(2000, w || 100)))}
        />
      </div>

      {fontState.status === 'loading' && <p className={styles.status}>Loading font…</p>}
      {fontState.status === 'error' && (
        <p className={styles.statusError}>Font failed to load: {fontState.error}</p>
      )}

      {pngError && <p className={styles.statusError}>PNG export failed: {pngError}</p>}

      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.primary}`}
          disabled={!canExport}
          onClick={handleDownloadSvg}
        >
          Download SVG
        </button>
        <button
          className={`${styles.button} ${styles.secondary}`}
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
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform={layout.topTransform}>
            <path d={ROUNDABOUT_PATH} fill="#66381E" />
          </g>
          {layout.textPathD && <path d={layout.textPathD} fill="#66381E" />}
        </svg>
      )}
    </div>
  )

  return <WidgetLayout sidebar={sidebar} main={main} />
}
