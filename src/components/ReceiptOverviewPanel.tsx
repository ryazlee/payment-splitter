import { Link, type To } from 'react-router-dom'
import { formatMoney } from '../utils/receipt'
import ReceiptUploadZone from './ReceiptUploadZone'

type ReceiptOverviewPanelProps = {
  title: string
  receiptTotal: number
  unassignedTotal: number
  remainingTotal: number
  participantCount: number
  receiptPreviewUrl: string
  isOcrProcessing: boolean
  ocrStatus: string
  ocrProgress: number
  notice: string
  payerVenmo: string
  summaryLocation: To
  onTitleChange: (value: string) => void
  onPayerVenmoChange: (value: string) => void
  onReceiptFileSelect: (file: File) => void
  onRetryReceiptOcr: () => void
  onCopyShareLink: () => void
  onCopySummary: () => void
  onClearReceipt: () => void
}

export default function ReceiptOverviewPanel({
  title,
  receiptTotal,
  unassignedTotal,
  remainingTotal,
  participantCount,
  receiptPreviewUrl,
  isOcrProcessing,
  ocrStatus,
  ocrProgress,
  notice,
  payerVenmo,
  summaryLocation,
  onTitleChange,
  onPayerVenmoChange,
  onReceiptFileSelect,
  onRetryReceiptOcr,
  onCopyShareLink,
  onCopySummary,
  onClearReceipt,
}: ReceiptOverviewPanelProps) {
  return (
    <section className="space-y-3 rounded-app border border-border bg-surface p-4">
      <input
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        className="w-full rounded bg-inset px-4 py-3 text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
        placeholder="Receipt name"
      />

      <div className="text-sm text-fg-secondary">
        {formatMoney(receiptTotal)} total · {formatMoney(unassignedTotal)} unassigned · {formatMoney(remainingTotal)} open
      </div>

      <label className="block space-y-1">
        <span className="text-sm text-fg-muted">Your Venmo handle (for payment links)</span>
        <div className="flex items-center rounded bg-inset focus-within:ring-2 focus-within:ring-accent">
          <span className="pl-3 text-sm text-fg-muted">@</span>
          <input
            value={payerVenmo}
            onChange={(event) => onPayerVenmoChange(event.target.value)}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-transparent py-2 pr-3 pl-1 text-sm text-fg placeholder:text-fg-muted focus:outline-none"
          />
        </div>
      </label>

      <ReceiptUploadZone
        receiptPreviewUrl={receiptPreviewUrl}
        isProcessing={isOcrProcessing}
        ocrStatus={ocrStatus}
        ocrProgress={ocrProgress}
        onFileSelect={onReceiptFileSelect}
        onRetry={onRetryReceiptOcr}
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCopyShareLink}
          className="rounded-[10px] bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast hover:opacity-90"
        >
          Copy link
        </button>
        <button
          type="button"
          onClick={onClearReceipt}
          className="rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-fg hover:bg-inset"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onCopySummary}
          className="rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-fg hover:bg-inset"
        >
          Copy summary
        </button>
        <Link
          to={summaryLocation}
          className="rounded-[10px] border border-border bg-surface px-3 py-2 text-center text-sm text-fg hover:bg-inset"
        >
          Show summary
        </Link>
      </div>

      {participantCount > 0 ? (
        <div className="text-sm text-fg-muted">{participantCount} people in the split</div>
      ) : null}

      {notice ? <p className="text-sm text-fg-secondary">{notice}</p> : null}
    </section>
  )
}
