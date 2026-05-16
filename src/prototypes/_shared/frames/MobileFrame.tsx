import type { ReactNode } from 'react'
import styles from './MobileFrame.module.css'

interface Props {
  children: ReactNode
}

export default function MobileFrame({ children }: Props) {
  return (
    <div className={styles.device}>
      <div className={styles.speaker} aria-hidden />
      <div className={styles.sideButton} aria-hidden />
      <div className={styles.screen} data-mobile-screen="true">
        {children}
      </div>
    </div>
  )
}
