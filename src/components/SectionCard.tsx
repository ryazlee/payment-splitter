import type { ReactNode } from 'react'

type SectionCardProps = {
  title?: string
  subtitle?: string
  children: ReactNode
  noPadding?: boolean
}

export default function SectionCard({
  title,
  subtitle,
  children,
  noPadding,
}: SectionCardProps) {
  return (
    <section className="surface-card">
      {title ? (
        <div className="surface-card__header">
          <p className="section-label">{title}</p>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      ) : null}
      <div className={noPadding ? undefined : 'surface-card__body'}>{children}</div>
    </section>
  )
}
