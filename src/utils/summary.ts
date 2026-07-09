import type { ComputedReceiptItem, ReceiptState, SummaryRow } from '../types'
import { createSummaryUrl } from './hashState'
import { formatMoney, parseMoneyInput, parseQuantity } from './receipt'
import {
  buildVenmoPaymentNote,
  buildVenmoWebPayUrl,
  normalizeVenmoHandle,
} from './venmo'

export type ReceiptSummary = {
  participants: string[]
  items: ComputedReceiptItem[]
  subtotal: number
  taxAmount: number
  tipAmount: number
  feesAmount: number
  discountAmount: number
  receiptTotal: number
  remainingTotal: number
  unassignedTotal: number
  summaryRows: SummaryRow[]
}

export function computeReceiptSummary(state: ReceiptState): ReceiptSummary {
  const participants = Array.from(
    new Set(state.participants.map((name) => name.trim()).filter(Boolean)),
  )
  const participantSet = new Set(participants)
  const items = state.items.map((item) => {
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
  const taxAmount = parseMoneyInput(state.tax)
  const tipAmount = parseMoneyInput(state.tip)
  const feesAmount = parseMoneyInput(state.fees)
  const discountAmount = parseMoneyInput(state.discount)
  const summaryRows = participants.map((participant) => {
    const assignedItems = items.filter((item) => item.assignees.includes(participant))
    const itemsTotal = assignedItems.reduce((sum, item) => sum + item.perPerson, 0)
    const shareRatio = subtotal > 0 ? itemsTotal / subtotal : 0
    const taxShare = taxAmount * shareRatio
    const tipShare = tipAmount * shareRatio
    const feesShare = feesAmount * shareRatio
    const discountShare = discountAmount * shareRatio
    const grandTotal = itemsTotal + taxShare + tipShare + feesShare - discountShare

    return {
      participant,
      assignedItems,
      itemsTotal,
      taxShare,
      tipShare,
      feesShare,
      discountShare,
      grandTotal,
    }
  })
  const unassignedTotal = items
    .filter((item) => item.total > 0 && item.assignees.length === 0)
    .reduce((sum, item) => sum + item.total, 0)
  const receiptTotal = subtotal + taxAmount + tipAmount + feesAmount - discountAmount
  const remainingTotal = Math.max(
    receiptTotal - summaryRows.reduce((sum, row) => sum + row.grandTotal, 0),
    0,
  )

  return {
    participants,
    items,
    subtotal,
    taxAmount,
    tipAmount,
    feesAmount,
    discountAmount,
    receiptTotal,
    remainingTotal,
    unassignedTotal,
    summaryRows,
  }
}

export function buildSummaryText(state: ReceiptState, summary: ReceiptSummary): string {
  const receiptTitle = state.title || 'Shared receipt'
  const payerVenmo = normalizeVenmoHandle(state.payerVenmo)
  const summaryStats = [
    `Subtotal: ${formatMoney(summary.subtotal)}`,
    ...(summary.taxAmount > 0 ? [`Tax: ${formatMoney(summary.taxAmount)}`] : []),
    ...(summary.tipAmount > 0 ? [`Tip: ${formatMoney(summary.tipAmount)}`] : []),
    ...(summary.feesAmount > 0 ? [`Fees: ${formatMoney(summary.feesAmount)}`] : []),
    ...(summary.discountAmount > 0 ? [`Discount: -${formatMoney(summary.discountAmount)}`] : []),
    `Total: ${formatMoney(summary.receiptTotal)}`,
  ]

  const lines = [
    receiptTitle,
    `Summary: ${createSummaryUrl(state)}`,
    '',
    ...summaryStats,
    '',
    ...summary.summaryRows.flatMap((row) => {
      const itemLines = row.assignedItems.length
        ? row.assignedItems.map(
            (item) => `  - ${item.name || 'Untitled item'}: ${formatMoney(item.perPerson)}`,
          )
        : ['  - No assigned items']

      const percentage =
        summary.receiptTotal > 0 ? Math.round((row.grandTotal / summary.receiptTotal) * 100) : 0
      const venmoUrl =
        payerVenmo && row.grandTotal > 0
          ? buildVenmoWebPayUrl(
              payerVenmo,
              row.grandTotal,
              buildVenmoPaymentNote(receiptTitle, row.participant),
            )
          : null

      return [
        `${row.participant} (${percentage}%): ${formatMoney(row.grandTotal)}`,
        ...itemLines,
        ...(row.taxShare > 0 ? [`  - Tax: ${formatMoney(row.taxShare)}`] : []),
        ...(row.tipShare > 0 ? [`  - Tip: ${formatMoney(row.tipShare)}`] : []),
        ...(row.feesShare > 0 ? [`  - Fees: ${formatMoney(row.feesShare)}`] : []),
        ...(row.discountShare > 0 ? [`  - Discount: -${formatMoney(row.discountShare)}`] : []),
        ...(venmoUrl ? [`  ${venmoUrl}`] : []),
        '',
      ]
    }),
  ]

  return lines.join('\n').trimEnd()
}
