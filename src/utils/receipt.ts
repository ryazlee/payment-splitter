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

export function normalizeCurrencyInput(value: string): string {
  const digitsAndDots = value.replace(/[^\d.]/g, '')
  if (!digitsAndDots) {
    return ''
  }

  const [wholePart = '', ...decimalParts] = digitsAndDots.split('.')
  const decimals = decimalParts.join('').slice(0, 2)
  const normalizedWhole = wholePart.replace(/^0+(?=\d)/, '')
  const safeWhole = normalizedWhole || (digitsAndDots.startsWith('.') ? '0' : '')

  if (digitsAndDots.includes('.')) {
    return `${safeWhole || '0'}.${decimals}`
  }

  return safeWhole
}

export function normalizeQuantityInput(value: string): string {
  const digitsOnly = value.replace(/\D/g, '')
  if (!digitsOnly) {
    return ''
  }

  return digitsOnly.replace(/^0+(?=\d)/, '')
}

export function parseQuantity(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1
  }

  return parsed
}

export function formatMoney(value: number): string {
  return currency.format(value || 0)
}

function extractLastAmount(line: string): string {
  const matches = line.match(/-?\$?\d+(?:[.,]\d{2})?/g)
  if (!matches || matches.length === 0) {
    return ''
  }

  const amount = parseMoneyInput(matches.at(-1)?.replace(',', '.') ?? '')
  return amount > 0 ? amount.toFixed(2) : ''
}

function extractSignedAmount(line: string): number {
  const matches = line.match(/-?\$?\d+(?:[.,]\d{2})?/g)
  if (!matches || matches.length === 0) {
    return 0
  }

  const raw = matches.at(-1)?.replace(',', '.') ?? ''
  return parseMoneyInput(raw)
}

function isStandaloneAmountLine(line: string): boolean {
  return /^\s*-?\$?\d+(?:[.,]\d{2})?\s*$/.test(line)
}

type ChargeType = 'tax' | 'tip' | 'fees' | 'discount'

const CHARGE_LABELS: Record<ChargeType, RegExp[]> = {
  tax: [
    /\b(?:sales|state|local|city|county|occupation)?\s*tax\b/i,
    /\bvat\b/i,
    /\bgst\b/i,
    /\bhst\b/i,
    /\bpst\b/i,
    /\btax\s*\d/i,
  ],
  tip: [
    /\b(?:auto\s*)?gratuity\b/i,
    /\b(?:suggested\s*)?tip\b/i,
    /\btip\s*\d/i,
  ],
  fees: [
    /\bservice\s*(?:charge|fee)\b/i,
    /\bdelivery\s*fee\b/i,
    /\bconvenience\s*fee\b/i,
    /\bprocessing\s*fee\b/i,
    /\b(?:health|mandate|regulatory)\s*fee\b/i,
    /\badmin(?:istrative)?\s*fee\b/i,
    /\bsurcharge\b/i,
    /\b(?:bag|bottle|cup)\s*fee\b/i,
    /\b(?:SF|CA)\s+(?:mandate|health|surcharge)\b/i,
    /\b(?:additional|extra)\s+fee\b/i,
  ],
  discount: [
    /\bdiscount\b/i,
    /\bpromo(?:tion)?\b/i,
    /\bcoupon\b/i,
    /\bsavings\b/i,
    /\brewards?\b/i,
    /\bloyalty\b/i,
  ],
}

const CHARGE_SKIP =
  /^(subtotal|total due|amount due|grand total|balance due|change due|total|items?)$/i

function classifyChargeLine(line: string): ChargeType | null {
  const normalized = line.trim()
  if (!normalized || CHARGE_SKIP.test(normalized)) {
    return null
  }

  for (const type of ['discount', 'tip', 'tax', 'fees'] as const) {
    if (CHARGE_LABELS[type].some((pattern) => pattern.test(normalized))) {
      return type
    }
  }

  return null
}

function formatChargeTotal(value: number): string {
  return value > 0 ? value.toFixed(2) : ''
}

function parseReceiptCharges(lines: string[]): {
  tax: string
  tip: string
  fees: string
  discount: string
  consumedLineIndexes: Set<number>
} {
  const totals: Record<ChargeType, number> = {
    tax: 0,
    tip: 0,
    fees: 0,
    discount: 0,
  }
  const consumedLineIndexes = new Set<number>()

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const chargeType = classifyChargeLine(line)
    if (!chargeType) {
      continue
    }

    let amount = extractSignedAmount(line)
    let consumedThrough = index

    if (amount <= 0 && index + 1 < lines.length && isStandaloneAmountLine(lines[index + 1])) {
      amount = extractSignedAmount(lines[index + 1])
      consumedThrough = index + 1
    }

    if (amount <= 0) {
      continue
    }

    totals[chargeType] += chargeType === 'discount' ? Math.abs(amount) : amount
    consumedLineIndexes.add(index)
    if (consumedThrough !== index) {
      consumedLineIndexes.add(consumedThrough)
    }
  }

  return {
    tax: formatChargeTotal(totals.tax),
    tip: formatChargeTotal(totals.tip),
    fees: formatChargeTotal(totals.fees),
    discount: formatChargeTotal(totals.discount),
    consumedLineIndexes,
  }
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
  const skipWords =
    /(subtotal|total due|amount due|grand total|balance due|change due|cash|visa|mastercard|amex|debit|credit|table|server|guest|receipt|order|privacy|phone|cashier|dine-in|powered|thank you|merchant|auth|approval|transaction|card|tender|signature|customer copy)/i
  const lines = text
    .split(/\r?\n/)
    .map(cleanReceiptLine)
    .filter(Boolean)

  const { tax, tip, fees, discount, consumedLineIndexes } = parseReceiptCharges(lines)

  const items: ReceiptItem[] = []
  let pendingItem: { name: string; quantity: number } | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (consumedLineIndexes.has(index)) {
      continue
    }

    if (skipWords.test(line) || /\btotal\b/i.test(line) || classifyChargeLine(line)) {
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
        name: appendDetail(pendingItem.name, detail),
        quantity: pendingItem.quantity,
      }
      continue
    }

    const lastItem = items.at(-1)
    if (lastItem && looksLikeContinuation(detail)) {
      lastItem.name = appendDetail(lastItem.name, detail)
    }
  }

  return { items, tax, tip, fees, discount }
}