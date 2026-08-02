import type { SummaryRow } from '../types'
import { formatMoney } from '../utils/receipt'
import {
  buildVenmoPaymentNote,
  buildVenmoPayLinkLabel,
  buildVenmoWebPayUrl,
  normalizeVenmoHandle,
} from '../utils/venmo'
import SectionCard from './SectionCard'

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
    <SectionCard
      title="Summary"
      subtitle={
        showVenmoLinks && normalizedPayerVenmo
          ? `Tap a Venmo link below to pay @${normalizedPayerVenmo}.`
          : 'Per-person totals with tax, tip, and fees included.'
      }
    >
      <div className="stack">
        <div className="summary-stats">
          {summaryStats.map((stat) => (
            <div
              key={stat.label}
              className={
                stat.emphasize ? 'summary-stat summary-stat--strong' : 'summary-stat'
              }
            >
              <span className="summary-stat__label">{stat.label}</span>
              <span className="summary-stat__value">{formatMoney(stat.value)}</span>
            </div>
          ))}
        </div>

        <div className="stack stack--tight">
          {summaryRows.length > 0 ? (
            summaryRows.map((row) => {
              const venmoNote = buildVenmoPaymentNote(receiptTitle, row.participant)
              const venmoUrl =
                showVenmoLinks && normalizedPayerVenmo && row.grandTotal > 0
                  ? buildVenmoWebPayUrl(normalizedPayerVenmo, row.grandTotal, venmoNote)
                  : null

              return (
                <article key={row.participant} className="person-row">
                  <div className="person-row__top">
                    <div>
                      <span className="person-row__name">{row.participant}</span>
                      <span className="person-row__pct">
                        {receiptTotal > 0
                          ? `${Math.round((row.grandTotal / receiptTotal) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                    <span className="person-row__total">{formatMoney(row.grandTotal)}</span>
                  </div>
                  <div className="person-row__lines">
                    {row.assignedItems.length > 0 ? (
                      row.assignedItems.map((item) => (
                        <div
                          key={`${row.participant}-${item.id}`}
                          className="person-row__line"
                        >
                          <span>
                            {item.name || 'Untitled item'}
                            {item.shareCount > 1 ? ` ×${item.shareCount}` : ''}
                          </span>
                          <span>{formatMoney(item.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="person-row__line">
                        <span>No assigned items</span>
                        <span>{formatMoney(0)}</span>
                      </div>
                    )}
                    {row.taxShare > 0 ? (
                      <div className="person-row__line">
                        <span>Tax</span>
                        <span>{formatMoney(row.taxShare)}</span>
                      </div>
                    ) : null}
                    {row.tipShare > 0 ? (
                      <div className="person-row__line">
                        <span>Tip</span>
                        <span>{formatMoney(row.tipShare)}</span>
                      </div>
                    ) : null}
                    {row.feesShare > 0 ? (
                      <div className="person-row__line">
                        <span>Fees</span>
                        <span>{formatMoney(row.feesShare)}</span>
                      </div>
                    ) : null}
                    {row.discountShare > 0 ? (
                      <div className="person-row__line">
                        <span>Discount</span>
                        <span>-{formatMoney(row.discountShare)}</span>
                      </div>
                    ) : null}
                    {venmoUrl ? (
                      <a href={venmoUrl} className="person-row__pay">
                        {buildVenmoPayLinkLabel(row.grandTotal, normalizedPayerVenmo)}
                      </a>
                    ) : null}
                  </div>
                </article>
              )
            })
          ) : (
            <p className="empty-hint">Add people to generate a summary.</p>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
