export type ReceiptItem = {
  id: string
  name: string
  price: string
  quantity: string
  assignees: string[]
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
  perPerson: number
}

export type SummaryRow = {
  participant: string
  assignedItems: ComputedReceiptItem[]
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