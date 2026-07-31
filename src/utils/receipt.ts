import type { ParsedReceiptImport, ReceiptItem, ReceiptState } from '../types'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const MONTH_NAMES =
  'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec'

export function normalizeShares(shares: unknown): Record<string, number> {
  if (!shares || typeof shares !== 'object' || Array.isArray(shares)) {
    return {}
  }

  const next: Record<string, number> = {}
  for (const [name, value] of Object.entries(shares as Record<string, unknown>)) {
    if (!name.trim()) {
      continue
    }
    const count = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(count) || count <= 0) {
      continue
    }
    next[name] = Math.min(Math.floor(count), 255)
  }
  return next
}

export function sharesFromAssignees(assignees: string[]): Record<string, number> {
  const next: Record<string, number> = {}
  for (const name of assignees) {
    if (name.trim()) {
      next[name] = 1
    }
  }
  return next
}

export function getShareTotal(shares: Record<string, number>): number {
  return Object.values(shares).reduce((sum, count) => sum + count, 0)
}

/** Keep share counts from exceeding the item quantity (drops overflow from later entries). */
export function clampSharesToQuantity(
  shares: Record<string, number>,
  quantity: number,
): Record<string, number> {
  const maxUnits = Math.max(1, Math.floor(quantity) || 1)
  let remaining = maxUnits
  const next: Record<string, number> = {}

  for (const [name, count] of Object.entries(shares)) {
    if (remaining <= 0) {
      break
    }
    const capped = Math.min(Math.max(Math.floor(count), 0), remaining)
    if (capped > 0) {
      next[name] = capped
      remaining -= capped
    }
  }

  return next
}

export function createItem(overrides: Partial<ReceiptItem> = {}): ReceiptItem {
  const { shares, quantity = '1', ...rest } = overrides
  const quantityValue = typeof quantity === 'string' && quantity ? quantity : '1'
  return {
    id: crypto.randomUUID(),
    name: '',
    price: '',
    ...rest,
    quantity: quantityValue,
    shares: clampSharesToQuantity(normalizeShares(shares), parseQuantity(quantityValue)),
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
    payerVenmo: '',
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
  const matches = line.match(/-?\$\d+(?:[.,]\d{2})?|-?\d+[.,]\d{2}/g)
  if (!matches || matches.length === 0) {
    return ''
  }

  const amount = parseMoneyInput(matches.at(-1)?.replace(',', '.') ?? '')
  return amount > 0 ? amount.toFixed(2) : ''
}

function extractSignedAmount(line: string): number {
  const matches = line.match(/-?\$\d+(?:[.,]\d{2})?|-?\d+[.,]\d{2}/g)
  if (!matches || matches.length === 0) {
    return 0
  }

  const raw = matches.at(-1)?.replace(',', '.') ?? ''
  return parseMoneyInput(raw)
}

function isStandaloneAmountLine(line: string): boolean {
  return /^\s*-?(?:\$\d+(?:[.,]\d{2})?|\d+[.,]\d{2})\s*$/.test(line)
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

function parseItemQuantityCount(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 999) {
    return 1
  }

  return parsed
}

function parseEachUnitPrice(line: string): number | undefined {
  const match = line.match(/\(\s*\$?(\d+(?:[.,]\d{2})?)\s*(?:each|ea\.?)\s*\)/i)
  if (!match) {
    return undefined
  }

  const amount = parseMoneyInput(match[1].replace(',', '.'))
  return amount > 0 ? amount : undefined
}

function parseNamePart(namePart: string): {
  quantity: number
  name: string
  unitPrice?: number
} {
  let remaining = namePart.trim()
  let quantity = 1
  let unitPrice: number | undefined

  const leadingWithUnitPrice = remaining.match(
    /^(\d{1,3})\s*[@×xX]\s*\$?(\d+(?:[.,]\d{2})?)\s+(.+)$/,
  )
  if (leadingWithUnitPrice) {
    quantity = parseItemQuantityCount(leadingWithUnitPrice[1])
    unitPrice = parseMoneyInput(leadingWithUnitPrice[2].replace(',', '.'))
    remaining = leadingWithUnitPrice[3]
  } else {
    const leadingWithMultiplier = remaining.match(/^(\d{1,3})\s*[@×xX]\s*(.+)$/)
    if (leadingWithMultiplier) {
      quantity = parseItemQuantityCount(leadingWithMultiplier[1])
      remaining = leadingWithMultiplier[2]
    } else {
      const leadingQuantity = remaining.match(/^(?:qty\.?\s*:?\s*)?(\d{1,3})\s+(.+)$/i)
      if (leadingQuantity) {
        quantity = parseItemQuantityCount(leadingQuantity[1])
        remaining = leadingQuantity[2]
      }
    }
  }

  if (quantity === 1) {
    const trailingQuantity = remaining.match(
      /^(.+?)\s+(?:[@×xX]\s*(\d{1,3})|\((\d{1,3})\)|qty\.?\s*:?\s*(\d{1,3}))$/i,
    )
    if (trailingQuantity) {
      remaining = trailingQuantity[1]
      quantity = parseItemQuantityCount(
        trailingQuantity[2] ?? trailingQuantity[3] ?? trailingQuantity[4] ?? '1',
      )
    }
  }

  const eachPrice = parseEachUnitPrice(remaining)
  if (eachPrice) {
    unitPrice = eachPrice
    remaining = remaining.replace(/\(\s*\$?\d+(?:[.,]\d{2})?\s*(?:each|ea\.?)\s*\)/i, ' ')
  }

  const inlineUnitPrice = remaining.match(/\s+@\s*\$?(\d+(?:[.,]\d{2})?)\s*/i)
  if (inlineUnitPrice) {
    unitPrice = parseMoneyInput(inlineUnitPrice[1].replace(',', '.'))
    remaining = remaining.replace(inlineUnitPrice[0], ' ')
  }

  return {
    quantity,
    name: cleanItemName(remaining),
    unitPrice: unitPrice && unitPrice > 0 ? unitPrice : undefined,
  }
}

function resolveItemPricing(
  lineTotal: number,
  quantity: number,
  unitPrice?: number,
): { quantity: number; unitPrice: number } {
  const safeQuantity = quantity > 1 ? quantity : 1

  if (unitPrice && unitPrice > 0) {
    return {
      quantity: safeQuantity,
      unitPrice,
    }
  }

  if (safeQuantity > 1 && lineTotal > 0) {
    return {
      quantity: safeQuantity,
      unitPrice: lineTotal / safeQuantity,
    }
  }

  return {
    quantity: 1,
    unitPrice: lineTotal,
  }
}

function cleanItemName(rawName: string): string {
  return rawName
    .replace(/^\s*#?\d+\s*[@×xX]?\s*/, '')
    .replace(/^(?:qty\.?\s*:?\s*)?\d+\s+/i, '')
    .replace(/^([A-Z]{1,3}\s*)?\d{0,3}\s*[A-Z]?\d{0,3}\.?\s+/, '')
    .replace(/^[A-Z]?\d{1,3}[A-Z]?\.?\s+/, '')
    .replace(/^[^A-Za-z]+/, '')
    .replace(/\s+[@×xX]\s*\d+\s*$/i, '')
    .replace(/\s+\(\d+\)\s*$/, '')
    .replace(/\s+qty\.?\s*:?\s*\d+\s*$/i, '')
    .replace(/\s+@\s*\$?\d+(?:[.,]\d{2})?\s*$/i, '')
    .replace(/\(\s*\$?\d+(?:[.,]\d{2})?\s*(?:each|ea\.?)\s*\)/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeContinuation(line: string): boolean {
  if (!line) {
    return false
  }

  if (parseEachUnitPrice(line)) {
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

function isPhoneLine(line: string): boolean {
  return /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/.test(line)
    && !/\$\d/.test(line)
}

function isZipLine(line: string): boolean {
  return /^\d{5}(?:-\d{4})?$/.test(line.trim())
}

function isWebsiteLine(line: string): boolean {
  return /^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?$/i.test(line.trim())
}

function isAddressLine(line: string): boolean {
  if (/\$\d|\d+[.,]\d{2}/.test(line)) {
    return false
  }

  const hasStreetNumber = /^\d{1,6}\s+[A-Za-z]/.test(line)
  const hasStreetType =
    /\b(?:st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|ct|court|pl|place)\b\.?/i.test(line)
  const hasCityState = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\b/.test(line)
  const hasUnit = /\b(?:suite|ste|apt|unit|#)\s*\d+/i.test(line)

  return (hasStreetNumber && hasStreetType) || hasStreetNumber || hasCityState || hasUnit
}

function isHeaderNoiseLine(line: string): boolean {
  return (
    isPhoneLine(line)
    || isZipLine(line)
    || isWebsiteLine(line)
    || isAddressLine(line)
    || /^(?:for here|to go|take ?out|dine[- ]?in|pickup|delivery)$/i.test(line)
    || /^(?:aid|auth(?:orization)?|approval|verified|merchant|terminal|batch|check|guest|server|table|host)\b/i.test(line)
    || /\b(?:visa|mastercard|amex|discover|debit|credit)\b/i.test(line)
    || /^(?:receipt|order|check)\s*[#:.]?\s*\w+/i.test(line)
    || /^\(?\d{1,2}:\d{2}\s*(?:am|pm)\)?$/i.test(line)
    || (/\b\d{1,2}:\d{2}\s*(?:am|pm)\b/i.test(line) && !/\$\d/.test(line))
    || /^[A-Z]{1,4}\.?$/i.test(line)
  )
}

function extractDateFromText(text: string): string {
  const monthDayYear = text.match(
    new RegExp(`\\b(${MONTH_NAMES})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{2,4})\\b`, 'i'),
  )
  if (monthDayYear) {
    const [, month, day, yearRaw] = monthDayYear
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
    return `${month} ${Number(day)}, ${year}`
  }

  const numericDate = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/)
  if (numericDate) {
    const [, month, day, yearRaw] = numericDate
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
    return `${Number(month)}/${Number(day)}/${year}`
  }

  return ''
}

function looksLikeRestaurantName(line: string): boolean {
  if (!line || line.length < 2 || line.length > 60) {
    return false
  }

  if (isHeaderNoiseLine(line) || classifyChargeLine(line) || /\$\d/.test(line)) {
    return false
  }

  if (!/[A-Za-z]{2,}/.test(line)) {
    return false
  }

  if (/^\d/.test(line)) {
    return false
  }

  return true
}

function extractReceiptTitle(lines: string[]): string {
  const restaurantName = lines.find((line) => looksLikeRestaurantName(line)) ?? ''
  const date = extractDateFromText(lines.join(' '))

  if (restaurantName && date) {
    return `${restaurantName} · ${date}`
  }

  return restaurantName || date
}

function refineChargeAgainstItems(
  chargeAmount: string,
  items: ReceiptItem[],
  lines: string[],
  chargeType: ChargeType,
  consumedLineIndexes: Set<number>,
): string {
  const amount = parseMoneyInput(chargeAmount)
  if (amount <= 0) {
    return chargeAmount
  }

  const itemsSubtotal = items.reduce(
    (sum, item) => sum + parseQuantity(item.quantity) * parseMoneyInput(item.price),
    0,
  )
  if (itemsSubtotal <= 0) {
    return chargeAmount
  }

  const looksLikeSubtotal = Math.abs(amount - itemsSubtotal) < 0.02
  if (!looksLikeSubtotal) {
    return chargeAmount
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (classifyChargeLine(lines[index]) !== chargeType) {
      continue
    }

    if (index + 1 < lines.length && isStandaloneAmountLine(lines[index + 1])) {
      const nextAmount = extractSignedAmount(lines[index + 1])
      if (nextAmount > 0 && Math.abs(nextAmount - itemsSubtotal) >= 0.02) {
        consumedLineIndexes.add(index + 1)
        return nextAmount.toFixed(2)
      }
    }
  }

  return ''
}

export function normalizeState(input: unknown): ReceiptState | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const candidate = input as Partial<ReceiptState>
  const items = Array.isArray(candidate.items)
    ? candidate.items.map((item) => {
        const rawItem = item as Partial<ReceiptItem> & { assignees?: unknown }
        const fromShares = normalizeShares(rawItem.shares)
        const fromAssignees = Array.isArray(rawItem.assignees)
          ? sharesFromAssignees(
              rawItem.assignees.filter((name): name is string => typeof name === 'string'),
            )
          : {}
        return createItem({
          id: typeof rawItem.id === 'string' && rawItem.id ? rawItem.id : crypto.randomUUID(),
          name: typeof rawItem.name === 'string' ? rawItem.name : '',
          price: typeof rawItem.price === 'string' ? rawItem.price : '',
          quantity: typeof rawItem.quantity === 'string' ? rawItem.quantity : '1',
          shares: Object.keys(fromShares).length > 0 ? fromShares : fromAssignees,
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
    payerVenmo: typeof candidate.payerVenmo === 'string' ? candidate.payerVenmo : '',
  }
}

type PendingItem = { name: string; quantity: number; unitPrice?: number }

function tryCommitPendingItem(
  pendingItem: PendingItem | null,
  amount: number,
  eachUnitPrice: number | undefined,
  participants: string[],
): { item: ReceiptItem | null; pendingItem: PendingItem | null } {
  if (!pendingItem || (amount <= 0 && !eachUnitPrice)) {
    return { item: null, pendingItem }
  }

  const pricing = resolveItemPricing(
    amount > 0 ? amount : (eachUnitPrice ?? 0) * pendingItem.quantity,
    pendingItem.quantity,
    eachUnitPrice ?? pendingItem.unitPrice,
  )

  if (pricing.unitPrice <= 0 || !pendingItem.name) {
    return { item: null, pendingItem }
  }

  return {
    item: createItem({
      name: pendingItem.name,
      price: pricing.unitPrice.toFixed(2),
      quantity: pricing.quantity.toString(),
      shares: sharesFromAssignees(participants),
    }),
    pendingItem: null,
  }
}

export function parseReceiptText(text: string, participants: string[]): ParsedReceiptImport {
  const skipWords =
    /(subtotal|total due|amount due|grand total|balance due|change due|cash|visa|mastercard|amex|debit|credit|table|server|guest|receipt|order|privacy|phone|cashier|dine-in|powered|thank you|merchant|auth|approval|transaction|card|tender|signature|customer copy|authorization|verified|for here|to go)/i
  const lines = text
    .split(/\r?\n/)
    .map(cleanReceiptLine)
    .filter(Boolean)

  const title = extractReceiptTitle(lines)
  const { tax, tip, fees, discount, consumedLineIndexes } = parseReceiptCharges(lines)

  const items: ReceiptItem[] = []
  let pendingItem: PendingItem | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (consumedLineIndexes.has(index)) {
      continue
    }

    if (
      skipWords.test(line)
      || /\btotal\b/i.test(line)
      || classifyChargeLine(line)
      || isHeaderNoiseLine(line)
    ) {
      continue
    }

    const eachUnitPrice = parseEachUnitPrice(line)
    const amount = extractAmountValue(line)
    const match = line.match(/(.+?)\s+(-?(?:\$\d+(?:[.,]\d{2})?|\d+[.,]\d{2}))$/)

    const committed = tryCommitPendingItem(pendingItem, amount, eachUnitPrice, participants)
    if (committed.item) {
      items.push(committed.item)
      pendingItem = committed.pendingItem
      continue
    }
    pendingItem = committed.pendingItem

    const quantityOnly = line.match(/^(.+?)\s+[@×xX]\s*(\d{1,3})$/i)
    if (quantityOnly && !/(?:\$\d|\d+[.,]\d{2})/.test(line)) {
      const name = cleanItemName(quantityOnly[1])
      if (name) {
        pendingItem = {
          name: pendingItem ? appendDetail(pendingItem.name, name) : name,
          quantity: parseItemQuantityCount(quantityOnly[2]),
          unitPrice: pendingItem?.unitPrice,
        }
        continue
      }
    }

    if (match) {
      const parsedName = parseNamePart(match[1])
      const quantity = pendingItem?.quantity ?? parsedName.quantity
      const name = pendingItem && looksLikeContinuation(parsedName.name)
        ? appendDetail(pendingItem.name, parsedName.name)
        : parsedName.name

      if (amount > 0 && name) {
        const pricing = resolveItemPricing(
          amount,
          quantity,
          eachUnitPrice ?? parsedName.unitPrice ?? pendingItem?.unitPrice,
        )

        items.push(
          createItem({
            name,
            price: pricing.unitPrice.toFixed(2),
            quantity: pricing.quantity.toString(),
            shares: sharesFromAssignees(participants),
          }),
        )
        pendingItem = null
        continue
      }

      if (amount === 0 && parsedName.name) {
        pendingItem = {
          name: pendingItem ? appendDetail(pendingItem.name, parsedName.name) : parsedName.name,
          quantity,
          unitPrice: parsedName.unitPrice ?? pendingItem?.unitPrice,
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
        unitPrice: pendingItem.unitPrice,
      }
      continue
    }

    const lastItem = items.at(-1)
    if (lastItem && looksLikeContinuation(detail)) {
      lastItem.name = appendDetail(lastItem.name, detail)
    }
  }

  const refinedTip = refineChargeAgainstItems(tip, items, lines, 'tip', consumedLineIndexes)
  const refinedTax = refineChargeAgainstItems(tax, items, lines, 'tax', consumedLineIndexes)

  return {
    title,
    items,
    tax: refinedTax,
    tip: refinedTip,
    fees,
    discount,
  }
}
