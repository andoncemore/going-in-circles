import { Link } from 'react-router-dom'
import { widgets } from '../widgets'
import styles from './Home.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Tools</h1>
      <p className={styles.subtitle}>Graphics generators and design utilities.</p>
      <div className={styles.grid}>
        {widgets.map((widget) => (
          <Link key={widget.path} to={widget.path} className={styles.card}>
            <div className={styles.cardTitle}>{widget.name}</div>
            <div className={styles.cardDescription}>{widget.description}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
