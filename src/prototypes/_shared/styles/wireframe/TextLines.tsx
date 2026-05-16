import styles from './TextLines.module.css'

interface Props {
  count?: number
  variant?: 'on-light' | 'on-dark'
}

export default function TextLines({ count = 3, variant = 'on-light' }: Props) {
  const variantClass = variant === 'on-dark' ? styles.onDark : styles.onLight
  return (
    <div className={styles.stack}>
      {Array.from({ length: count }).map((_, i) => {
        const isLast = i === count - 1
        return (
          <div
            key={i}
            data-line
            data-last={isLast ? 'true' : 'false'}
            data-variant={variant}
            className={`${styles.line} ${variantClass} ${isLast ? styles.last : ''}`}
          />
        )
      })}
    </div>
  )
}
