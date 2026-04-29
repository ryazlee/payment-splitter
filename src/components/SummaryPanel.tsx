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
  const summaryStats = [
    { label: 'Subtotal', value: subtotal },
    ...(taxAmount > 0 ? [{ label: 'Tax', value: taxAmount }] : []),
    ...(tipAmount > 0 ? [{ label: 'Tip', value: tipAmount }] : []),
    ...(feesAmount > 0 ? [{ label: 'Fees', value: feesAmount }] : []),
    { label: 'Total', value: receiptTotal, emphasize: true },
  ]

  return (
    <section className="space-y-3 rounded bg-gray-800 p-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {summaryStats.map((stat) => (
          <div key={stat.label} className="flex min-w-[calc(50%-0.5rem)] flex-1 items-center justify-between gap-3">
            <span className={stat.emphasize ? 'text-white' : 'text-gray-400'}>{stat.label}</span>
            <span className={stat.emphasize ? 'text-white' : 'text-gray-300'}>{formatMoney(stat.value)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {summaryRows.length > 0 ? (
          summaryRows.map((row) => (
            <article key={row.participant} className="rounded bg-gray-700 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-white">{row.participant}</span>
                  <span className="text-xs text-gray-400">
                    {receiptTotal > 0 ? `${Math.round((row.grandTotal / receiptTotal) * 100)}%` : '0%'}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">{formatMoney(row.grandTotal)}</span>
              </div>
              <div className="mt-1.5 space-y-0.5 text-xs text-gray-400">
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
                {row.feesShare > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Fees</span>
                    <span>{formatMoney(row.feesShare)}</span>
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