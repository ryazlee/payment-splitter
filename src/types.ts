export type ReceiptItem = {
  id: string
  name: string
  price: string
  quantity: string
  /** How many units (or share parts) each person got. */
  shares: Record<string, number>
}

export type ReceiptState = {
  title: string
  participants: string[]
  items: ReceiptItem[]
  tax: string
  tip: string
  fees: string
  discount: string
  payerVenmo: string
}

export type ComputedReceiptItem = ReceiptItem & {
  total: number
  shareTotal: number
  amountByParticipant: Record<string, number>
}

export type SummaryItemShare = {
  id: string
  name: string
  shareCount: number
  amount: number
}

export type SummaryRow = {
  participant: string
  assignedItems: SummaryItemShare[]
  itemsTotal: number
  taxShare: number
  tipShare: number
  feesShare: number
  discountShare: number
  grandTotal: number
}

export type ParsedReceiptImport = {
  title: string
  items: ReceiptItem[]
  tax: string
  tip: string
  fees: string
  discount: string
}
