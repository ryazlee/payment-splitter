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
    <header className="app-header">
      <div className="app-header-inner">
        <div className="brand-block">
          <h1 className="brand">{title}</h1>
          {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        </div>
        <div className="header-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
