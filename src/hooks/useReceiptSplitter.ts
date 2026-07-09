import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReceiptItem, ReceiptState } from '../types'
import { createShareUrl, createSummaryPath, encodeHashState, readHashState } from '../utils/hashState'
import {
  createEmptyState,
  createItem,
  normalizeCurrencyInput,
  normalizeQuantityInput,
  parseReceiptText,
} from '../utils/receipt'
import { buildSummaryText, computeReceiptSummary } from '../utils/summary'
import { normalizeVenmoHandle } from '../utils/venmo'

export type ReceiptSplitterModel = ReturnType<typeof useReceiptSplitter>

export function useReceiptSplitter() {
  const [receiptState, setReceiptState] = useState<ReceiptState>(() => {
    return readHashState() ?? createEmptyState()
  })
  const [personDraft, setPersonDraft] = useState('')
  const [ocrPreview, setOcrPreview] = useState('')
  const [ocrStatus, setOcrStatus] = useState('Idle')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState('')
  const [notice, setNotice] = useState('')
  const lastSerializedRef = useRef('')
  const lastReceiptFileRef = useRef<File | null>(null)
  const receiptPreviewUrlRef = useRef('')

  useEffect(() => {
    const serialized = encodeHashState(receiptState)
    if (serialized === lastSerializedRef.current) {
      return
    }

    lastSerializedRef.current = serialized
    const nextUrl = serialized ? `${window.location.pathname}#${serialized}` : window.location.pathname
    window.history.replaceState(null, '', nextUrl)
  }, [receiptState])

  useEffect(() => {
    const handleHashChange = () => {
      const nextState = readHashState()
      if (!nextState) {
        return
      }

      const serialized = encodeHashState(nextState)
      if (serialized === lastSerializedRef.current) {
        return
      }

      lastSerializedRef.current = serialized
      startTransition(() => {
        setReceiptState(nextState)
      })
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const summary = useMemo(() => computeReceiptSummary(receiptState), [receiptState])
  const {
    participants,
    subtotal,
    taxAmount,
    tipAmount,
    feesAmount,
    discountAmount,
    receiptTotal,
    remainingTotal,
    unassignedTotal,
    summaryRows,
  } = summary

  function updateState(updater: (current: ReceiptState) => ReceiptState) {
    setReceiptState((current) => updater(current))
  }

  function addParticipant() {
    const nextName = personDraft.trim()
    if (!nextName) {
      return
    }

    const exists = receiptState.participants.some(
      (name) => name.trim().toLowerCase() === nextName.toLowerCase(),
    )
    if (exists) {
      setNotice(`"${nextName}" is already in the party.`)
      return
    }

    updateState((current) => ({
      ...current,
      participants: [...current.participants, nextName],
    }))
    setPersonDraft('')
    setNotice('')
  }

  function removeParticipant(name: string) {
    updateState((current) => ({
      ...current,
      participants: current.participants.filter((participant) => participant !== name),
      items: current.items.map((item) => ({
        ...item,
        assignees: item.assignees.filter((participant) => participant !== name),
      })),
    }))
  }

  function addItem() {
    updateState((current) => ({
      ...current,
      items: [...current.items, createItem()],
    }))
  }

  function updateItem(itemId: string, field: keyof ReceiptItem, value: string | string[]) {
    let nextValue = value
    if (typeof value === 'string') {
      if (field === 'price') {
        nextValue = normalizeCurrencyInput(value)
      }

      if (field === 'quantity') {
        nextValue = normalizeQuantityInput(value)
      }
    }

    updateState((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        return {
          ...item,
          [field]: nextValue,
        }
      }),
    }))
  }

  function removeItem(itemId: string) {
    updateState((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? [createItem()]
          : current.items.filter((item) => item.id !== itemId),
    }))
  }

  function toggleAssignee(itemId: string, participant: string) {
    updateState((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        const isSelected = item.assignees.includes(participant)
        return {
          ...item,
          assignees: isSelected
            ? item.assignees.filter((name) => name !== participant)
            : [...item.assignees, participant],
        }
      }),
    }))
  }

  useEffect(() => {
    return () => {
      if (receiptPreviewUrlRef.current) {
        URL.revokeObjectURL(receiptPreviewUrlRef.current)
      }
    }
  }, [])

  function setReceiptPreview(file: File) {
    if (receiptPreviewUrlRef.current) {
      URL.revokeObjectURL(receiptPreviewUrlRef.current)
    }

    const nextUrl = URL.createObjectURL(file)
    receiptPreviewUrlRef.current = nextUrl
    setReceiptPreviewUrl(nextUrl)
  }

  const processReceiptFile = useCallback(async (file: File) => {
    const {
      describeUnsupportedReceiptImage,
      isSupportedReceiptImage,
      recognizeReceiptImage,
    } = await import('../utils/ocr')

    if (!isSupportedReceiptImage(file)) {
      setNotice(describeUnsupportedReceiptImage(file))
      return
    }

    lastReceiptFileRef.current = file
    setReceiptPreview(file)
    setNotice('First scan downloads the scanner (~15 MB), then caches it for next time.')
    setOcrProgress(0)
    setOcrStatus('Loading scanner...')
    setIsOcrProcessing(true)

    try {
      const extractedText = await recognizeReceiptImage(file, ({ status, progress }) => {
        setOcrStatus(status)
        setOcrProgress(progress)
      })
      const parsedReceipt = parseReceiptText(extractedText, participants)
      setOcrPreview(extractedText)
      setNotice('')

      startTransition(() => {
        updateState((current) => ({
          ...current,
          title:
            current.title === 'Shared receipt'
              ? file.name.replace(/\.[^.]+$/, '')
              : current.title,
          tax: parsedReceipt.tax || current.tax,
          tip: parsedReceipt.tip || current.tip,
          fees: parsedReceipt.fees || current.fees,
          discount: parsedReceipt.discount || current.discount,
          items:
            parsedReceipt.items.length > 0
              ? [...current.items.filter((item) => item.name || item.price), ...parsedReceipt.items]
              : current.items,
        }))
      })

      setOcrStatus(
        parsedReceipt.items.length > 0
          ? `Imported ${parsedReceipt.items.length} item${parsedReceipt.items.length === 1 ? '' : 's'}`
          : 'OCR finished, but no obvious line items were detected',
      )
    } catch {
      setOcrStatus('OCR failed')
      setNotice('The receipt image could not be processed. Try a sharper crop or enter items manually.')
    } finally {
      setIsOcrProcessing(false)
      setOcrProgress(0)
    }
  }, [participants])

  const retryReceiptOcr = useCallback(async () => {
    const file = lastReceiptFileRef.current
    if (!file) {
      return
    }

    await processReceiptFile(file)
  }, [processReceiptFile])

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(createShareUrl(receiptState))
      setNotice('Share link copied to clipboard.')
    } catch {
      setNotice('Clipboard access failed. Copy the URL from the address bar instead.')
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildSummaryText(receiptState, summary))
      setNotice('Summary copied to clipboard.')
    } catch {
      setNotice('Clipboard access failed. You can still share the URL hash link.')
    }
  }

  function clearReceipt() {
    setNotice('')
    setOcrPreview('')
    setOcrProgress(0)
    setOcrStatus('Idle')
    setIsOcrProcessing(false)
    lastReceiptFileRef.current = null
    if (receiptPreviewUrlRef.current) {
      URL.revokeObjectURL(receiptPreviewUrlRef.current)
      receiptPreviewUrlRef.current = ''
    }
    setReceiptPreviewUrl('')
    startTransition(() => {
      setReceiptState(createEmptyState())
    })
  }

  function updateCharge(field: 'tax' | 'tip' | 'fees' | 'discount', value: string) {
    updateState((current) => ({
      ...current,
      [field]: normalizeCurrencyInput(value),
    }))
  }

  function updateTitle(value: string) {
    updateState((current) => ({
      ...current,
      title: value,
    }))
  }

  function updatePayerVenmo(value: string) {
    updateState((current) => ({
      ...current,
      payerVenmo: normalizeVenmoHandle(value),
    }))
  }

  return {
    receiptState,
    summaryPath: createSummaryPath(receiptState),
    personDraft,
    participants,
    summaryRows,
    subtotal,
    taxAmount,
    tipAmount,
    feesAmount,
    discountAmount,
    receiptTotal,
    remainingTotal,
    unassignedTotal,
    ocrStatus,
    ocrProgress,
    isOcrProcessing,
    receiptPreviewUrl,
    notice,
    ocrPreview,
    setPersonDraft,
    updateTitle,
    updatePayerVenmo,
    addParticipant,
    removeParticipant,
    addItem,
    updateItem,
    removeItem,
    toggleAssignee,
    processReceiptFile,
    retryReceiptOcr,
    copyShareLink,
    copySummary,
    clearReceipt,
    updateCharge,
  }
}