type AppHeaderProps = {
  title: string
}

export default function AppHeader({ title }: AppHeaderProps) {
  return (
    <div className="pt-4 text-center">
      <h1 className="text-xl text-white">{title}</h1>
    </div>
  )
}