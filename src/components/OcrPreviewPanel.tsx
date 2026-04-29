type OcrPreviewPanelProps = {
  ocrPreview: string
}

export default function OcrPreviewPanel({ ocrPreview }: OcrPreviewPanelProps) {
  if (!ocrPreview) {
    return null
  }

  return (
    <details className="rounded bg-gray-800 p-4 text-sm text-gray-300">
      <summary className="cursor-pointer list-none">OCR text</summary>
      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-xs text-gray-400">
        {ocrPreview}
      </pre>
    </details>
  )
}