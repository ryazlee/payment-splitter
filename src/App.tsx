import SplitterScreen from './components/screens/SplitterScreen'
import { useReceiptSplitter } from './hooks/useReceiptSplitter'

function App() {
  const splitter = useReceiptSplitter()

  return <SplitterScreen splitter={splitter} />
}

export default App
