import type { SummaryRow } from '../types'
import { formatMoney } from '../utils/receipt'

type SummaryPanelProps = {
  subtotal: number
  taxAmount: number
  tipAmount: number
  feesAmount: number
  receiptTotal: number
  summaryRows: SummaryRow[]
}

export default function SummaryPanel({
  subtotal,
  taxAmount,
  tipAmount,
  feesAmount,
  receiptTotal,
  summaryRows,
}: SummaryPanelProps) {
  return (
    <section className="space-y-2 rounded bg-gray-800 p-4">
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Subtotal</span>
        <span>{formatMoney(subtotal)}</span>
      </div>
      {taxAmount > 0 ? (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Tax</span>
          <span>{formatMoney(taxAmount)}</span>
        </div>
      ) : null}
      {tipAmount > 0 ? (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Tip</span>
          <span>{formatMoney(tipAmount)}</span>
        </div>
      ) : null}
      {feesAmount > 0 ? (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Other fees</span>
          <span>{formatMoney(feesAmount)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between pt-1 text-sm text-white">
        <span>Total</span>
        <span>{formatMoney(receiptTotal)}</span>
      </div>
      <div className="space-y-2 pt-2">
        {summaryRows.length > 0 ? (
          summaryRows.map((row) => (
            <article key={row.participant} className="rounded bg-gray-700 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">{row.participant}</span>
                <span className="text-sm font-medium text-white">{formatMoney(row.grandTotal)}</span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-gray-400">
                {row.assignedItems.length > 0 ? (
                  row.assignedItems.map((item) => (
                    <div key={`${row.participant}-${item.id}`} className="flex items-center justify-between gap-3">
                      <span className="truncate">{item.name || 'Untitled item'}</span>
                      <span>{formatMoney(item.perPerson)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span>No assigned items</span>
                    <span>{formatMoney(0)}</span>
                  </div>
                )}
                {row.taxShare > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Tax</span>
                    <span>{formatMoney(row.taxShare)}</span>
                  </div>
                ) : null}
                {row.tipShare > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Tip</span>
                    <span>{formatMoney(row.tipShare)}</span>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-gray-400">Add people to generate a summary.</p>
        )}
      </div>
    </section>
  )
}