import { useRef, type ChangeEvent } from 'react'
import Button from './Button'

type ReceiptUploadZoneProps = {
  receiptPreviewUrl: string
  isProcessing: boolean
  ocrStatus: string
  ocrProgress: number
  onFileSelect: (file: File) => void
  onRetry: () => void
}

export default function ReceiptUploadZone({
  receiptPreviewUrl,
  isProcessing,
  ocrStatus,
  ocrProgress,
  onFileSelect,
  onRetry,
}: ReceiptUploadZoneProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div className="stack">
      {receiptPreviewUrl ? (
        <img
          src={receiptPreviewUrl}
          alt="Uploaded receipt preview"
          className="receipt-preview"
        />
      ) : null}

      <div className="btn-grid">
        <Button
          label="Upload photo"
          variant="secondary"
          disabled={isProcessing}
          onClick={() => galleryInputRef.current?.click()}
        />
        <Button
          label="Take photo"
          variant="secondary"
          disabled={isProcessing}
          onClick={() => cameraInputRef.current?.click()}
        />
        {receiptPreviewUrl ? (
          <Button
            label="Scan again"
            className="btn-grid__full"
            disabled={isProcessing}
            onClick={onRetry}
          />
        ) : null}
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />

      <p className="meta meta--muted meta--sm">
        OCR: {ocrStatus}
        {ocrProgress > 0 ? ` (${Math.round(ocrProgress * 100)}%)` : ''}
      </p>
    </div>
  )
}
