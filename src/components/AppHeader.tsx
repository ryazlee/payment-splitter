import ThemeToggle from './ThemeToggle'

type AppHeaderProps = {
  title: string
  subtitle?: string
}

export default function AppHeader({
  title,
  subtitle = 'Split the bill without the spreadsheet.',
}: AppHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 pt-1">
      <div className="min-w-0">
        <h1 className="m-0 text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle ? (
          <p className="mt-1 mb-0 text-[0.8125rem] leading-snug text-fg-secondary">
            {subtitle}
          </p>
        ) : null}
      </div>
      <ThemeToggle />
    </header>
  )
}
