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
      <main className="min-h-screen bg-gray-900 p-4 text-white">
        <div className="mx-auto max-w-md space-y-4">
          <AppHeader title="Receipt split" />
          <section className="space-y-3 rounded bg-gray-800 p-4 text-sm text-gray-300">
            <p>No receipt data found in this link.</p>
            <Link to="/" className="inline-flex text-white underline decoration-gray-500 underline-offset-2">
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
    <main className="min-h-screen bg-gray-900 p-4 text-white">
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
            className="text-sm text-gray-400 underline decoration-gray-600 underline-offset-2 hover:text-gray-300"
          >
            Edit receipt
          </a>
        </div>
      </div>
    </main>
  )
}
