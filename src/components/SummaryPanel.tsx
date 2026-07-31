import type { SummaryRow } from '../types'
import { formatMoney } from '../utils/receipt'
import {
  buildVenmoPaymentNote,
  buildVenmoPayLinkLabel,
  buildVenmoWebPayUrl,
  normalizeVenmoHandle,
} from '../utils/venmo'

type SummaryPanelProps = {
  receiptTitle: string
  payerVenmo: string
  showVenmoLinks?: boolean
  subtotal: number
  taxAmount: number
  tipAmount: number
  feesAmount: number
  discountAmount: number
  receiptTotal: number
  summaryRows: SummaryRow[]
}

export default function SummaryPanel({
  receiptTitle,
  payerVenmo,
  showVenmoLinks = false,
  subtotal,
  taxAmount,
  tipAmount,
  feesAmount,
  discountAmount,
  receiptTotal,
  summaryRows,
}: SummaryPanelProps) {
  const normalizedPayerVenmo = normalizeVenmoHandle(payerVenmo)
  const summaryStats = [
    { label: 'Subtotal', value: subtotal },
    ...(taxAmount > 0 ? [{ label: 'Tax', value: taxAmount }] : []),
    ...(tipAmount > 0 ? [{ label: 'Tip', value: tipAmount }] : []),
    ...(feesAmount > 0 ? [{ label: 'Fees', value: feesAmount }] : []),
    ...(discountAmount > 0 ? [{ label: 'Discount', value: -discountAmount }] : []),
    { label: 'Total', value: receiptTotal, emphasize: true },
  ]

  return (
    <section className="space-y-3 rounded-app border border-border bg-surface p-4">
      {showVenmoLinks && normalizedPayerVenmo ? (
        <p className="text-xs text-fg-muted">
          Tap a Venmo link below to pay @{normalizedPayerVenmo}.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {summaryStats.map((stat) => (
          <div key={stat.label} className="flex min-w-[calc(50%-0.5rem)] flex-1 items-center justify-between gap-3">
            <span className={stat.emphasize ? 'text-fg' : 'text-fg-muted'}>{stat.label}</span>
            <span className={stat.emphasize ? 'text-fg' : 'text-fg-secondary'}>{formatMoney(stat.value)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {summaryRows.length > 0 ? (
          summaryRows.map((row) => {
            const venmoNote = buildVenmoPaymentNote(receiptTitle, row.participant)
            const venmoUrl =
              showVenmoLinks && normalizedPayerVenmo && row.grandTotal > 0
                ? buildVenmoWebPayUrl(normalizedPayerVenmo, row.grandTotal, venmoNote)
                : null

            return (
              <article key={row.participant} className="rounded bg-inset px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-fg">{row.participant}</span>
                    <span className="text-xs text-fg-muted">
                      {receiptTotal > 0 ? `${Math.round((row.grandTotal / receiptTotal) * 100)}%` : '0%'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-fg">{formatMoney(row.grandTotal)}</span>
                </div>
                <div className="mt-1.5 space-y-0.5 text-xs text-fg-muted">
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
                  {row.discountShare > 0 ? (
                    <div className="flex items-center justify-between gap-3">
                      <span>Discount</span>
                      <span>-{formatMoney(row.discountShare)}</span>
                    </div>
                  ) : null}
                  {venmoUrl ? (
                    <a
                      href={venmoUrl}
                      className="mt-1 inline-flex text-xs font-medium text-fg underline decoration-border underline-offset-2"
                    >
                      {buildVenmoPayLinkLabel(row.grandTotal, normalizedPayerVenmo)}
                    </a>
                  ) : null}
                </div>
              </article>
            )
          })
        ) : (
          <p className="text-sm text-fg-muted">Add people to generate a summary.</p>
        )}
      </div>
    </section>
  )
}
