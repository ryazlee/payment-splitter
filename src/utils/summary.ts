import type { ComputedReceiptItem, ReceiptState, SummaryRow } from '../types'
import { createSummaryUrl } from './hashState'
import { formatMoney, getShareTotal, parseMoneyInput, parseQuantity } from './receipt'
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

function amountForShare(
  total: number,
  shareCount: number,
  divisor: number,
): number {
  if (shareCount <= 0 || divisor <= 0 || total <= 0) {
    return 0
  }
  return (shareCount / divisor) * total
}

export function computeReceiptSummary(state: ReceiptState): ReceiptSummary {
  const participants = Array.from(
    new Set(state.participants.map((name) => name.trim()).filter(Boolean)),
  )
  const participantSet = new Set(participants)
  const equalSplit = state.items.length <= 1
  const items = state.items.map((item) => {
    const quantity = parseQuantity(item.quantity)
    const total = quantity * parseMoneyInput(item.price)
    const shares: Record<string, number> = {}
    for (const [name, count] of Object.entries(item.shares)) {
      if (participantSet.has(name) && count > 0) {
        shares[name] = count
      }
    }
    const shareTotal = getShareTotal(shares)
    // Equal-split: parts / number of parts. Assign mode: units / item quantity.
    const divisor = equalSplit ? shareTotal : quantity
    const amountByParticipant: Record<string, number> = {}
    for (const [name, count] of Object.entries(shares)) {
      amountByParticipant[name] = amountForShare(total, count, divisor)
    }

    return {
      ...item,
      total,
      shares,
      shareTotal,
      amountByParticipant,
    }
  })
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = parseMoneyInput(state.tax)
  const tipAmount = parseMoneyInput(state.tip)
  const feesAmount = parseMoneyInput(state.fees)
  const discountAmount = parseMoneyInput(state.discount)
  const summaryRows = participants.map((participant) => {
    const assignedItems = items
      .filter((item) => (item.shares[participant] ?? 0) > 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        shareCount: item.shares[participant] ?? 0,
        amount: item.amountByParticipant[participant] ?? 0,
      }))
    const itemsTotal = assignedItems.reduce((sum, item) => sum + item.amount, 0)
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
  const unassignedTotal = items.reduce((sum, item) => {
    if (item.total <= 0) {
      return sum
    }
    if (equalSplit) {
      return item.shareTotal > 0 ? sum : sum + item.total
    }
    const quantity = parseQuantity(item.quantity)
    if (quantity <= 0) {
      return sum
    }
    const unassignedUnits = Math.max(quantity - item.shareTotal, 0)
    return sum + (unassignedUnits / quantity) * item.total
  }, 0)
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
    '',
    ...summaryStats,
    '',
    ...summary.summaryRows.flatMap((row) => {
      const itemLines = row.assignedItems.length
        ? row.assignedItems.map((item) => {
            const qtyLabel = item.shareCount > 1 ? ` ×${item.shareCount}` : ''
            return `  - ${item.name || 'Untitled item'}${qtyLabel}: ${formatMoney(item.amount)}`
          })
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
    `Summary: ${createSummaryUrl(state)}`,
  ]

  return lines.join('\n').trimEnd()
}
