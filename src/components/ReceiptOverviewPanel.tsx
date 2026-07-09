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
  onTitleChange: (value: string) => void
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
  onTitleChange,
  onReceiptFileSelect,
  onRetryReceiptOcr,
  onCopyShareLink,
  onCopySummary,
  onClearReceipt,
}: ReceiptOverviewPanelProps) {
  return (
    <section className="space-y-3 rounded bg-gray-800 p-4">
      <input
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        className="w-full rounded bg-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
        placeholder="Receipt name"
      />

      <div className="text-sm text-gray-300">
        {formatMoney(receiptTotal)} total · {formatMoney(unassignedTotal)} unassigned · {formatMoney(remainingTotal)} open
      </div>

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
          className="rounded bg-white px-3 py-2 text-sm font-medium text-black hover:bg-gray-100"
        >
          Copy link
        </button>
        <button
          type="button"
          onClick={onCopySummary}
          className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
        >
          Copy summary
        </button>
        <button
          type="button"
          onClick={onClearReceipt}
          className="col-span-2 rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      {participantCount > 0 ? (
        <div className="text-sm text-gray-400">{participantCount} people in the split</div>
      ) : null}

      {notice ? <p className="text-sm text-gray-300">{notice}</p> : null}
    </section>
  )
}
