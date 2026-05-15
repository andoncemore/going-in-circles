import { useState } from 'react'
import WidgetLayout from '../../components/WidgetLayout'
import { useFont } from './font'
import styles from './styles.module.css'

export default function LogoWidget() {
  const [text, setText] = useState('')
  const [width, setWidth] = useState(320)
  const fontState = useFont()

  const ready = fontState.status === 'ready'
  const canExport = ready && text.length > 0

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

      <div className={styles.actions}>
        <button className={`${styles.button} ${styles.primary}`} disabled={!canExport}>
          Download SVG
        </button>
        <button className={`${styles.button} ${styles.secondary}`} disabled={!canExport}>
          Download PNG
        </button>
      </div>
    </div>
  )

  const main = (
    <div className={styles.previewWrap}>
      {!ready && <span className={styles.placeholder}>Waiting for font…</span>}
      {ready && <span className={styles.placeholder}>Type a location to preview.</span>}
    </div>
  )

  return <WidgetLayout sidebar={sidebar} main={main} />
}
