import { startTransition, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../AppHeader'
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
      <main className="min-h-screen bg-app p-4 text-fg">
        <div className="mx-auto max-w-md space-y-4">
          <AppHeader title="Receipt split" />
          <section className="space-y-3 rounded-app border border-border bg-surface p-4 text-sm text-fg-secondary">
            <p>No receipt data found in this link.</p>
            <Link to="/" className="inline-flex text-fg underline decoration-border underline-offset-2">
              Open receipt splitter
            </Link>
          </section>
        </div>
      </main>
    )
  }

  const summary = computeReceiptSummary(receiptState)
  const editorUrl = createShareUrl(receiptState)

  return (
    <main className="min-h-screen bg-app p-4 text-fg">
      <div className="mx-auto max-w-md space-y-4">
        <AppHeader title={receiptState.title || 'Receipt split'} />

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

        <div className="text-center">
          <a
            href={editorUrl}
            className="text-sm text-fg-muted underline decoration-border underline-offset-2 hover:text-fg-secondary"
          >
            Edit receipt
          </a>
        </div>
      </div>
    </main>
  )
}
