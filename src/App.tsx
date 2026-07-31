import { BrowserRouter, Route, Routes } from 'react-router-dom'
import SplitterScreen from './components/screens/SplitterScreen'
import SummaryScreen from './components/screens/SummaryScreen'
import { ThemeProvider } from './theme'

function getRouterBasename(): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename={getRouterBasename()}>
        <Routes>
          <Route path="/" element={<SplitterScreen />} />
          <Route path="/summary" element={<SummaryScreen />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
