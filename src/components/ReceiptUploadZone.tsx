import { useRef, type ChangeEvent } from 'react'

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
    <div className="space-y-3">
      {receiptPreviewUrl ? (
        <img
          src={receiptPreviewUrl}
          alt="Uploaded receipt preview"
          className="mx-auto max-h-48 w-full rounded bg-gray-900/40 object-contain"
        />
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isProcessing}
          className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Upload photo
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isProcessing}
          className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Take photo
        </button>
        {receiptPreviewUrl ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={isProcessing}
            className="col-span-2 rounded bg-white px-3 py-2 text-sm font-medium text-black hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Scan again
          </button>
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

      <div className="text-sm text-gray-400">
        OCR: {ocrStatus}
        {ocrProgress > 0 ? ` (${Math.round(ocrProgress * 100)}%)` : ''}
      </div>
    </div>
  )
}
