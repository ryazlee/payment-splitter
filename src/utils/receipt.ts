import type { ParsedReceiptImport, ReceiptItem, ReceiptState } from '../types'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function createItem(overrides: Partial<ReceiptItem> = {}): ReceiptItem {
  return {
    id: crypto.randomUUID(),
    name: '',
    price: '',
    quantity: '1',
    assignees: [],
    ...overrides,
  }
}

export function createEmptyState(): ReceiptState {
  return {
    title: 'Shared receipt',
    participants: [],
    items: [createItem()],
    tax: '',
    tip: '',
    fees: '',
    discount: '',
  }
}

export function parseMoneyInput(value: string): number {
  const normalized = value.replace(/[^\d.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseQuantity(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1
  }

  return parsed
}

export function formatMoney(value: number): string {
  return currency.format(value || 0)
}

export async function preprocessReceiptImage(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width * scale
  canvas.height = bitmap.height * scale

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Canvas preprocessing is unavailable in this browser.')
  }

  context.filter = 'grayscale(1) contrast(1.35) brightness(1.05)'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = imageData

  for (let index = 0; index < data.length; index += 4) {
    const value = data[index]
    const normalized = value > 178 ? 255 : Math.max(0, value - 24)
    data[index] = normalized
    data[index + 1] = normalized
    data[index + 2] = normalized
  }

  context.putImageData(imageData, 0, 0)
  return canvas
}

function extractLastAmount(line: string): string {
  const matches = line.match(/-?\$?\d+(?:[.,]\d{2})?/g)
  if (!matches || matches.length === 0) {
    return ''
  }

  const amount = parseMoneyInput(matches.at(-1)?.replace(',', '.') ?? '')
  return amount > 0 ? amount.toFixed(2) : ''
}

function cleanReceiptLine(line: string): string {
  return line
    .replace(/[|\\]/g, ' ')
    .replace(/[“”‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractAmountValue(line: string): number {
  return parseMoneyInput(extractLastAmount(line))
}

function extractLeadingQuantity(line: string): number {
  const match = line.match(/^\s*(\d{1,2})\s+/)
  if (!match) {
    return 1
  }

  const quantity = Number(match[1])
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

function cleanItemName(rawName: string): string {
  return rawName
    .replace(/^\s*#?\d+\s+/, '')
    .replace(/^([A-Z]{1,3}\s*)?\d{0,3}\s*[A-Z]?\d{0,3}\.?\s+/, '')
    .replace(/^[A-Z]?\d{1,3}[A-Z]?\.?\s+/, '')
    .replace(/^[^A-Za-z]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeContinuation(line: string): boolean {
  if (!line) {
    return false
  }

  return /^(large|small|medium|regular|combo|combination|extra|add|with|no\b|w\/|and\b)/i.test(line)
    || line.split(' ').length <= 6
}

function appendDetail(base: string, detail: string): string {
  if (!detail) {
    return base
  }

  return `${base} ${detail}`.replace(/\s+/g, ' ').trim()
}

export function normalizeState(input: unknown): ReceiptState | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const candidate = input as Partial<ReceiptState>
  const items = Array.isArray(candidate.items)
    ? candidate.items.map((item) => {
        const rawItem = item as Partial<ReceiptItem>
        return createItem({
          id: typeof rawItem.id === 'string' && rawItem.id ? rawItem.id : crypto.randomUUID(),
          name: typeof rawItem.name === 'string' ? rawItem.name : '',
          price: typeof rawItem.price === 'string' ? rawItem.price : '',
          quantity: typeof rawItem.quantity === 'string' ? rawItem.quantity : '1',
          assignees: Array.isArray(rawItem.assignees)
            ? rawItem.assignees.filter((name): name is string => typeof name === 'string')
            : [],
        })
      })
    : [createItem()]

  return {
    title: typeof candidate.title === 'string' ? candidate.title : 'Shared receipt',
    participants: Array.isArray(candidate.participants)
      ? candidate.participants.filter((name): name is string => typeof name === 'string')
      : [],
    items,
    tax: typeof candidate.tax === 'string' ? candidate.tax : '',
    tip: typeof candidate.tip === 'string' ? candidate.tip : '',
    fees: typeof candidate.fees === 'string' ? candidate.fees : '',
    discount: typeof candidate.discount === 'string' ? candidate.discount : '',
  }
}

export function parseReceiptText(text: string, participants: string[]): ParsedReceiptImport {
  const skipWords = /(subtotal|total|tax|tip|gratuity|balance|change|cash|visa|mastercard|amex|debit|credit|table|server|guest|receipt|order|privacy|clover|phone|cashier|dine-in|main dining|boulevard|vallejo|powered)/i
  const lines = text
    .split(/\r?\n/)
    .map(cleanReceiptLine)
    .filter(Boolean)

  let tax = ''
  let tip = ''

  const items: ReceiptItem[] = []
  let pendingItem: { name: string; quantity: number } | null = null

  for (const line of lines) {
    if (!tax && /\btax\b/i.test(line)) {
      tax = extractLastAmount(line)
    }

    if (!tip && /\b(tip|gratuity)\b/i.test(line)) {
      tip = extractLastAmount(line)
    }

    if (skipWords.test(line)) {
      continue
    }

    const match = line.match(/(.+?)\s+(-?\$?\d+(?:[.,]\d{2})?)$/)
    const amount = extractAmountValue(line)

    if (match) {
      const rawName = cleanItemName(match[1])
      const quantity: number = pendingItem?.quantity ?? extractLeadingQuantity(match[1])
      const name = pendingItem && looksLikeContinuation(rawName)
        ? appendDetail(pendingItem.name, rawName)
        : rawName

      if (amount > 0 && name) {
        const normalizedQuantity = quantity > 1 && amount / quantity > 0 ? quantity : 1
        const unitPrice = normalizedQuantity > 1 ? amount / normalizedQuantity : amount

        items.push(
          createItem({
            name,
            price: unitPrice.toFixed(2),
            quantity: normalizedQuantity.toString(),
            assignees: participants,
          }),
        )
        pendingItem = null
        continue
      }

      if (amount === 0 && rawName) {
        pendingItem = {
          name: pendingItem ? appendDetail(pendingItem.name, rawName) : rawName,
          quantity,
        }
        continue
      }
    }

    const detail = cleanItemName(line)
    if (!detail) {
      continue
    }

    if (pendingItem) {
      pendingItem = {
        ...pendingItem,
        name: appendDetail(pendingItem.name, detail),
      }
      continue
    }

    const lastItem = items.at(-1)
    if (lastItem && looksLikeContinuation(detail)) {
      lastItem.name = appendDetail(lastItem.name, detail)
    }
  }

  return { items, tax, tip }
}