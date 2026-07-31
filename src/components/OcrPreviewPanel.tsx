type OcrPreviewPanelProps = {
  ocrPreview: string
}

export default function OcrPreviewPanel({ ocrPreview }: OcrPreviewPanelProps) {
  if (!ocrPreview) {
    return null
  }

  return (
    <details className="rounded-app border border-border bg-surface p-4 text-sm text-fg-secondary">
      <summary className="cursor-pointer list-none">OCR text</summary>
      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-xs text-fg-muted">
        {ocrPreview}
      </pre>
    </details>
  )
}