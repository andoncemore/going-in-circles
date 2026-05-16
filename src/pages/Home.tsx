import { Link } from 'react-router-dom'
import { widgets } from '../widgets'
import { prototypes } from '../prototypes'
import styles from './Home.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Tools</h2>
        <p className={styles.sectionSubtitle}>Graphics generators and design utilities.</p>
        <div className={styles.grid}>
          {widgets.map((widget) => (
            <Link key={widget.path} to={widget.path} className={styles.card}>
              <div className={styles.cardTitle}>{widget.name}</div>
              <div className={styles.cardDescription}>{widget.description}</div>
            </Link>
          ))}
        </div>
      </section>

      {prototypes.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Prototypes</h2>
          <p className={styles.sectionSubtitle}>One-off explorations.</p>
          <div className={styles.prototypeList}>
            {prototypes.map((prototype) => (
              <Link key={prototype.path} to={prototype.path} className={styles.prototypeRow}>
                <span className={styles.prototypeName}>{prototype.name}</span>
                {' — '}
                <span className={styles.prototypeDescription}>{prototype.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
