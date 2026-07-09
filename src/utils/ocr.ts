import { PaddleOcrService, V5_EN_MOBILE_MODEL } from 'ppu-paddle-ocr/web'
import type { RecognitionResult } from 'ppu-paddle-ocr/web'

const MAX_OCR_DIMENSION = 2400
const MIN_OCR_DIMENSION = 1400
const MIN_LINE_CONFIDENCE = 0.45

type OcrProgress = {
  status: string
  progress: number
}

type OcrLogger = (update: OcrProgress) => void

let servicePromise: Promise<PaddleOcrService> | null = null
let activeLogger: OcrLogger | null = null

async function getOcrService(): Promise<PaddleOcrService> {
  if (!servicePromise) {
    servicePromise = (async () => {
      activeLogger?.({ status: 'Loading scanner models...', progress: 0.1 })

      const service = new PaddleOcrService({
        model: V5_EN_MOBILE_MODEL,
        processing: { engine: 'canvas-native' },
      })

      await service.initialize()
      activeLogger?.({ status: 'Scanner ready', progress: 0.2 })
      return service
    })()
  }

  return servicePromise
}

export function isSupportedReceiptImage(file: File): boolean {
  return file.type.startsWith('image/') && file.size <= 12 * 1024 * 1024
}

export function describeUnsupportedReceiptImage(file: File): string {
  if (!file.type.startsWith('image/')) {
    return 'Only image files are supported. Try a photo or screenshot of the receipt.'
  }

  if (file.size > 12 * 1024 * 1024) {
    return 'That image is too large. Try a tighter crop under 12 MB.'
  }

  return 'This file could not be used.'
}

export async function preprocessReceiptImage(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const longestEdge = Math.max(bitmap.width, bitmap.height)
  const targetLongestEdge = Math.min(
    MAX_OCR_DIMENSION,
    Math.max(MIN_OCR_DIMENSION, longestEdge),
  )
  const scale = targetLongestEdge / longestEdge

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Canvas preprocessing is unavailable in this browser.')
  }

  context.filter = 'grayscale(1) contrast(1.25) brightness(1.04)'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return canvas
}

function formatOcrLines(lines: RecognitionResult[][]): string {
  return lines
    .map((line) =>
      line
        .filter((segment) => segment.confidence >= MIN_LINE_CONFIDENCE)
        .map((segment) => segment.text.trim())
        .filter(Boolean)
        .join(' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n')
}

export async function recognizeReceiptImage(
  file: Blob,
  onProgress?: OcrLogger,
): Promise<string> {
  activeLogger = onProgress ?? null

  try {
    onProgress?.({ status: 'Preparing image...', progress: 0.05 })

    const service = await getOcrService()
    const preparedImage = await preprocessReceiptImage(file)

    onProgress?.({ status: 'Scanning receipt...', progress: 0.35 })

    const result = await service.recognize(preparedImage)
    const text = formatOcrLines(result.lines)

    onProgress?.({ status: 'Parsing items...', progress: 0.95 })

    return text.trim()
  } finally {
    activeLogger = null
  }
}
