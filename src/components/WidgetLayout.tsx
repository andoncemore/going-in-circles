import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './WidgetLayout.module.css'

interface Props {
  sidebar: ReactNode
  main: ReactNode
}

export default function WidgetLayout({ sidebar, main }: Props) {
  return (
    <div className={styles.layout}>
      <Link to="/" className={styles.backLink}>← Back to all tools</Link>
      <div className={styles.columns}>
        <aside className={styles.sidebar}>{sidebar}</aside>
        <main className={styles.main}>{main}</main>
      </div>
    </div>
  )
}
