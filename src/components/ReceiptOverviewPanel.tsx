import { Link, type To } from 'react-router-dom'
import { formatMoney } from '../utils/receipt'
import Button from './Button'
import ReceiptUploadZone from './ReceiptUploadZone'
import SectionCard from './SectionCard'

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
    <SectionCard title="Receipt" subtitle="Name it, scan it, then share the split.">
      <div className="stack">
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="input input--title"
          placeholder="Receipt name"
        />

        <p className="meta">
          {formatMoney(receiptTotal)} total · {formatMoney(unassignedTotal)} unassigned ·{' '}
          {formatMoney(remainingTotal)} open
        </p>

        <label className="field">
          <span className="field__label">Your Venmo handle (for payment links)</span>
          <div className="input-affix">
            <span className="input-affix__prefix">@</span>
            <input
              value={payerVenmo}
              onChange={(event) => onPayerVenmoChange(event.target.value)}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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

        <div className="btn-grid">
          <Button label="Copy link" onClick={onCopyShareLink} />
          <Button label="Reset" variant="secondary" onClick={onClearReceipt} />
          <Button label="Copy summary" variant="secondary" onClick={onCopySummary} />
          <Link to={summaryLocation} className="btn btn--secondary">
            Show summary
          </Link>
        </div>

        {participantCount > 0 ? (
          <p className="meta meta--muted meta--sm">{participantCount} people in the split</p>
        ) : null}

        {notice ? <p className="meta">{notice}</p> : null}
      </div>
    </SectionCard>
  )
}
