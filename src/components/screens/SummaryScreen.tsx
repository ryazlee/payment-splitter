import { startTransition, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../AppHeader'
import MakerCredit from '../MakerCredit'
import SectionCard from '../SectionCard'
import SummaryPanel from '../SummaryPanel'
import { createShareUrl, readHashState } from '../../utils/hashState'
import { computeReceiptSummary } from '../../utils/summary'

export default function SummaryScreen() {
  const [receiptState, setReceiptState] = useState(() => readHashState())

  useEffect(() => {
    function handleHashChange() {
      startTransition(() => {
        setReceiptState(readHashState())
      })
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (!receiptState) {
    return (
      <div className="app-shell">
        <AppHeader title="Receipt split" />
        <main className="app-main">
          <div className="shell-inner">
            <div className="page">
              <SectionCard title="Summary">
                <div className="stack">
                  <p className="empty-hint">No receipt data found in this link.</p>
                  <Link to="/" className="text-link">
                    Open receipt splitter
                  </Link>
                </div>
              </SectionCard>
            </div>
          </div>
        </main>
        <footer className="app-footer">
          <MakerCredit />
        </footer>
      </div>
    )
  }

  const summary = computeReceiptSummary(receiptState)
  const editorUrl = createShareUrl(receiptState)

  return (
    <div className="app-shell">
      <AppHeader title={receiptState.title || 'Receipt split'} />
      <main className="app-main">
        <div className="shell-inner">
          <div className="page">
            <SummaryPanel
              receiptTitle={receiptState.title}
              payerVenmo={receiptState.payerVenmo}
              showVenmoLinks
              subtotal={summary.subtotal}
              taxAmount={summary.taxAmount}
              tipAmount={summary.tipAmount}
              feesAmount={summary.feesAmount}
              discountAmount={summary.discountAmount}
              receiptTotal={summary.receiptTotal}
              summaryRows={summary.summaryRows}
            />

            <div className="center-link">
              <a href={editorUrl} className="text-link">
                Edit receipt
              </a>
            </div>
          </div>
        </div>
      </main>
      <footer className="app-footer">
        <MakerCredit />
      </footer>
    </div>
  )
}
