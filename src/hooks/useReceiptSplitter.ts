import { startTransition, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { createWorker, OEM, PSM } from 'tesseract.js'
import type { ReceiptItem, ReceiptState } from '../types'
import { encodeHashState, readHashState } from '../utils/hashState'
import {
  createEmptyState,
  createItem,
  formatMoney,
  parseMoneyInput,
  parseQuantity,
  parseReceiptText,
  preprocessReceiptImage,
} from '../utils/receipt'

export type ReceiptSplitterModel = ReturnType<typeof useReceiptSplitter>

export function useReceiptSplitter() {
  const [receiptState, setReceiptState] = useState<ReceiptState>(() => {
    return readHashState() ?? createEmptyState()
  })
  const [personDraft, setPersonDraft] = useState('')
  const [ocrPreview, setOcrPreview] = useState('')
  const [ocrStatus, setOcrStatus] = useState('Idle')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [notice, setNotice] = useState('')
  const lastSerializedRef = useRef('')

  useEffect(() => {
    const serialized = encodeHashState(receiptState)
    if (serialized === lastSerializedRef.current) {
      return
    }

    lastSerializedRef.current = serialized
    const nextUrl = `${window.location.pathname}${window.location.search}#${serialized}`
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

  const participants = Array.from(
    new Set(receiptState.participants.map((name) => name.trim()).filter(Boolean)),
  )
  const participantSet = new Set(participants)
  const items = receiptState.items.map((item) => {
    const total = parseQuantity(item.quantity) * parseMoneyInput(item.price)
    const assignees = item.assignees.filter((name) => participantSet.has(name))
    const perPerson = assignees.length > 0 ? total / assignees.length : 0

    return {
      ...item,
      total,
      assignees,
      perPerson,
    }
  })
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = parseMoneyInput(receiptState.tax)
  const tipAmount = parseMoneyInput(receiptState.tip)
  const feesAmount = parseMoneyInput(receiptState.fees)
  const summaryRows = participants.map((participant) => {
    const assignedItems = items.filter((item) => item.assignees.includes(participant))
    const itemsTotal = assignedItems.reduce((sum, item) => sum + item.perPerson, 0)
    const shareRatio = subtotal > 0 ? itemsTotal / subtotal : 0
    const taxShare = taxAmount * shareRatio
    const tipShare = tipAmount * shareRatio
    const feesShare = feesAmount * shareRatio
    const grandTotal = itemsTotal + taxShare + tipShare + feesShare

    return {
      participant,
      assignedItems,
      itemsTotal,
      taxShare,
      tipShare,
      feesShare,
      grandTotal,
    }
  })
  const unassignedTotal = items
    .filter((item) => item.total > 0 && item.assignees.length === 0)
    .reduce((sum, item) => sum + item.total, 0)
  const receiptTotal = subtotal + taxAmount + tipAmount + feesAmount
  const remainingTotal = Math.max(
    receiptTotal - summaryRows.reduce((sum, row) => sum + row.grandTotal, 0),
    0,
  )

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
    updateState((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        return {
          ...item,
          [field]: value,
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

  async function handleReceiptUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setNotice('')
    setOcrProgress(0)
    setOcrStatus('Reading receipt...')

    try {
      const worker = await createWorker('eng', OEM.LSTM_ONLY, {
        logger(message) {
          if (message.status) {
            setOcrStatus(message.status)
          }

          if (typeof message.progress === 'number') {
            setOcrProgress(message.progress)
          }
        },
      })

      const preparedImage = await preprocessReceiptImage(file)
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      })
      const result = await worker.recognize(preparedImage, { rotateAuto: true })
      await worker.terminate()

      const extractedText = result.data.text.trim()
      const parsedReceipt = parseReceiptText(extractedText, participants)
      setOcrPreview(extractedText)

      startTransition(() => {
        updateState((current) => ({
          ...current,
          title:
            current.title === 'Shared receipt'
              ? file.name.replace(/\.[^.]+$/, '')
              : current.title,
          tax: parsedReceipt.tax || current.tax,
          tip: parsedReceipt.tip || current.tip,
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
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setNotice('Share link copied to clipboard.')
    } catch {
      setNotice('Clipboard access failed. Copy the URL from the address bar instead.')
    }
  }

  async function copySummary() {
    const summaryStats = [
      `Subtotal: ${formatMoney(subtotal)}`,
      ...(taxAmount > 0 ? [`Tax: ${formatMoney(taxAmount)}`] : []),
      ...(tipAmount > 0 ? [`Tip: ${formatMoney(tipAmount)}`] : []),
      ...(feesAmount > 0 ? [`Fees: ${formatMoney(feesAmount)}`] : []),
      `Total: ${formatMoney(receiptTotal)}`,
    ]

    const lines = [
      receiptState.title || 'Shared receipt',
      '',
      ...summaryStats,
      '',
      ...summaryRows.flatMap((row) => {
        const itemLines = row.assignedItems.length
          ? row.assignedItems.map(
              (item) => `  - ${item.name || 'Untitled item'}: ${formatMoney(item.perPerson)}`,
            )
          : ['  - No assigned items']

        const percentage = receiptTotal > 0 ? Math.round((row.grandTotal / receiptTotal) * 100) : 0

        return [
          `${row.participant} (${percentage}%): ${formatMoney(row.grandTotal)}`,
          ...itemLines,
          ...(row.taxShare > 0 ? [`  - Tax: ${formatMoney(row.taxShare)}`] : []),
          ...(row.tipShare > 0 ? [`  - Tip: ${formatMoney(row.tipShare)}`] : []),
          ...(row.feesShare > 0 ? [`  - Fees: ${formatMoney(row.feesShare)}`] : []),
          '',
        ]
      }),
      `Share link: ${window.location.href}`,
    ]

    try {
      await navigator.clipboard.writeText(lines.join('\n'))
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
    startTransition(() => {
      setReceiptState(createEmptyState())
    })
  }

  function updateCharge(field: 'tax' | 'tip' | 'fees' | 'discount', value: string) {
    updateState((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateTitle(value: string) {
    updateState((current) => ({
      ...current,
      title: value,
    }))
  }

  return {
    receiptState,
    personDraft,
    participants,
    summaryRows,
    subtotal,
    taxAmount,
    tipAmount,
    feesAmount,
    receiptTotal,
    remainingTotal,
    unassignedTotal,
    ocrStatus,
    ocrProgress,
    notice,
    ocrPreview,
    setPersonDraft,
    updateTitle,
    addParticipant,
    removeParticipant,
    addItem,
    updateItem,
    removeItem,
    toggleAssignee,
    handleReceiptUpload,
    copyShareLink,
    copySummary,
    clearReceipt,
    updateCharge,
  }
}