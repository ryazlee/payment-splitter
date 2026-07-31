import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import SplitterScreen from './components/screens/SplitterScreen'
import SummaryScreen from './components/screens/SummaryScreen'
import { ThemeProvider } from './theme'
import { trackPageview } from './utils/analytics'

function getRouterBasename(): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function RouteAnalytics() {
  const location = useLocation()

  useEffect(() => {
    // Use the real browser path so GitHub Pages base (/payment-splitter/) is included.
    // Ignore hash — receipt state changes constantly and would flood GoatCounter.
    trackPageview()
  }, [location.pathname, location.search])

  return null
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename={getRouterBasename()}>
        <RouteAnalytics />
        <Routes>
          <Route path="/" element={<SplitterScreen />} />
          <Route path="/summary" element={<SummaryScreen />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
