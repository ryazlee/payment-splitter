type OcrPreviewPanelProps = {
  ocrPreview: string
}

export default function OcrPreviewPanel({ ocrPreview }: OcrPreviewPanelProps) {
  if (!ocrPreview) {
    return null
  }

  return (
    <details className="surface-card ocr-details">
      <summary>OCR text</summary>
      <pre>{ocrPreview}</pre>
    </details>
  )
}
