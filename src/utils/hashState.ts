import { deflateSync, inflateSync } from 'fflate'
import { decompressFromEncodedURIComponent } from 'lz-string'
import type { ReceiptItem, ReceiptState } from '../types'
import { createItem, getShareTotal, normalizeState, sharesFromAssignees } from './receipt'

/** Bare binary hashes (brief transitional format). */
const BINARY_PREFIX = 'b'
/** Compact binary payload marker used by older share links (`d:` looks like a URL scheme in iMessage). */
const DATA_PREFIX = 'd:'
/** Colon-free payload marker for new share links. */
const DATA_MARKER = 'd'
/** Older lz-string+JSON hashes. */
const LZ_PREFIX = 's:'
const TITLE_PARAM = 'title='

const LEGACY_ITEM_SEPARATOR = '~'
const LEGACY_ASSIGNEE_SEPARATOR = '|'
const RECORD_SEP = '\u001e'
const UNIT_SEP = '\u001f'

/** Equal-split assignee bitmask format. */
const BINARY_VERSION_V1 = 1
/** Per-person share counts. */
const BINARY_VERSION_V2 = 2

// Alphanumeric only — no punctuation in the compact payload.
const HASH_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function getAppRootPath(): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function encodeBaseAlphabet(bytes: Uint8Array, alphabet: string): string {
  if (bytes.length === 0) {
    return ''
  }

  const base = BigInt(alphabet.length)
  let leadingZeros = 0
  for (const byte of bytes) {
    if (byte !== 0) {
      break
    }
    leadingZeros += 1
  }

  let value = 0n
  for (const byte of bytes) {
    value = (value << 8n) + BigInt(byte)
  }

  if (value === 0n) {
    return alphabet[0].repeat(bytes.length)
  }

  let encoded = ''
  while (value > 0n) {
    const remainder = Number(value % base)
    encoded = alphabet[remainder] + encoded
    value /= base
  }

  return alphabet[0].repeat(leadingZeros) + encoded
}

function decodeBaseAlphabet(encoded: string, alphabet: string): Uint8Array | null {
  if (!encoded) {
    return new Uint8Array()
  }

  const base = BigInt(alphabet.length)
  const lookup = new Map([...alphabet].map((char, index) => [char, BigInt(index)]))

  let leadingZeros = 0
  for (const char of encoded) {
    if (char !== alphabet[0]) {
      break
    }
    leadingZeros += 1
  }

  let value = 0n
  for (const char of encoded) {
    const digit = lookup.get(char)
    if (digit === undefined) {
      return null
    }
    value = value * base + digit
  }

  const bytes: number[] = []
  while (value > 0n) {
    bytes.unshift(Number(value & 0xffn))
    value >>= 8n
  }

  return Uint8Array.from(Array.from({ length: leadingZeros }, () => 0).concat(bytes))
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    const padLength = (4 - (padded.length % 4)) % 4
    const binary = atob(padded + '='.repeat(padLength))
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}

function pushVarint(value: number, out: number[]) {
  let next = Math.max(0, Math.floor(value))
  while (next >= 0x80) {
    out.push((next & 0x7f) | 0x80)
    next >>>= 7
  }
  out.push(next)
}

function readVarint(
  bytes: Uint8Array,
  offset: { index: number },
): number | null {
  let result = 0
  let shift = 0

  while (offset.index < bytes.length) {
    const byte = bytes[offset.index]
    offset.index += 1
    result |= (byte & 0x7f) << shift
    if ((byte & 0x80) === 0) {
      return result >>> 0
    }
    shift += 7
    if (shift > 35) {
      return null
    }
  }

  return null
}

function pushString(value: string, out: number[]) {
  const encoded = new TextEncoder().encode(value)
  if (encoded.length > 255) {
    throw new Error('String exceeds 255 bytes')
  }
  out.push(encoded.length)
  for (const byte of encoded) {
    out.push(byte)
  }
}

function readString(bytes: Uint8Array, offset: { index: number }): string | null {
  if (offset.index >= bytes.length) {
    return null
  }

  const length = bytes[offset.index]
  offset.index += 1
  if (offset.index + length > bytes.length) {
    return null
  }

  const slice = bytes.subarray(offset.index, offset.index + length)
  offset.index += length
  return new TextDecoder().decode(slice)
}

function moneyToCents(value: string): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0
  }
  return Math.round(parsed * 100)
}

function centsToMoney(cents: number): string {
  return (cents / 100).toFixed(2)
}

function packBinaryState(
  state: ReceiptState,
  options: { includeTitle?: boolean } = {},
): Uint8Array {
  const includeTitle = options.includeTitle ?? true
  const participants = state.participants.map((name) => name.trim()).filter(Boolean)
  const participantIndex = new Map(participants.map((name, index) => [name, index]))
  const items = state.items.filter(
    (item) => item.name || item.price || getShareTotal(item.shares) > 0 || item.quantity !== '1',
  )

  const title =
    includeTitle && state.title && state.title !== 'Shared receipt' ? state.title : ''
  const taxCents = moneyToCents(state.tax)
  const tipCents = moneyToCents(state.tip)
  const feesCents = moneyToCents(state.fees)
  const discountCents = moneyToCents(state.discount)
  const venmo = state.payerVenmo.trim()

  let flags = 0
  if (title) flags |= 1
  if (taxCents > 0) flags |= 2
  if (tipCents > 0) flags |= 4
  if (feesCents > 0) flags |= 8
  if (discountCents > 0) flags |= 16
  if (venmo) flags |= 32

  const out: number[] = [BINARY_VERSION_V2, flags, participants.length]
  for (const participant of participants) {
    pushString(participant, out)
  }

  if (flags & 1) {
    pushString(title, out)
  }

  out.push(items.length)
  for (const item of items) {
    pushString(item.name, out)
    pushVarint(moneyToCents(item.price), out)

    const quantity = Math.min(Math.max(Number.parseInt(item.quantity, 10) || 1, 1), 255)
    out.push(quantity)

    const shareEntries = Object.entries(item.shares).filter(([name, count]) => {
      return count > 0 && participantIndex.has(name)
    })
    out.push(Math.min(shareEntries.length, 255))
    for (const [name, count] of shareEntries) {
      const index = participantIndex.get(name)
      if (typeof index !== 'number') {
        continue
      }
      out.push(index & 0xff, Math.min(Math.max(count, 1), 255))
    }
  }

  if (flags & 2) pushVarint(taxCents, out)
  if (flags & 4) pushVarint(tipCents, out)
  if (flags & 8) pushVarint(feesCents, out)
  if (flags & 16) pushVarint(discountCents, out)
  if (flags & 32) pushString(venmo, out)

  return Uint8Array.from(out)
}

function unpackBinaryStateV1(bytes: Uint8Array): ReceiptState | null {
  if (bytes.length < 3) {
    return null
  }

  const offset = { index: 1 }
  const flags = bytes[offset.index]
  offset.index += 1

  const participantCount = bytes[offset.index]
  offset.index += 1
  const participants: string[] = []
  for (let index = 0; index < participantCount; index += 1) {
    const name = readString(bytes, offset)
    if (name === null) {
      return null
    }
    participants.push(name)
  }

  let title = 'Shared receipt'
  if (flags & 1) {
    const parsedTitle = readString(bytes, offset)
    if (parsedTitle === null) {
      return null
    }
    title = parsedTitle || title
  }

  if (offset.index >= bytes.length) {
    return null
  }

  const itemCount = bytes[offset.index]
  offset.index += 1
  const items: ReceiptItem[] = []

  for (let index = 0; index < itemCount; index += 1) {
    const name = readString(bytes, offset)
    const priceCents = readVarint(bytes, offset)
    if (name === null || priceCents === null || offset.index >= bytes.length) {
      return null
    }

    const quantity = bytes[offset.index]
    offset.index += 1
    if (offset.index + 1 >= bytes.length) {
      return null
    }

    const mask = bytes[offset.index] | (bytes[offset.index + 1] << 8)
    offset.index += 2

    const assignees: string[] = []
    for (let bit = 0; bit < 16; bit += 1) {
      if (mask & (1 << bit) && participants[bit]) {
        assignees.push(participants[bit])
      }
    }

    items.push(
      createItem({
        name,
        price: priceCents > 0 ? centsToMoney(priceCents) : '',
        quantity: String(quantity || 1),
        shares: sharesFromAssignees(assignees),
      }),
    )
  }

  return readChargesAndNormalize(bytes, offset, flags, title, participants, items)
}

function unpackBinaryStateV2(bytes: Uint8Array): ReceiptState | null {
  if (bytes.length < 3) {
    return null
  }

  const offset = { index: 1 }
  const flags = bytes[offset.index]
  offset.index += 1

  const participantCount = bytes[offset.index]
  offset.index += 1
  const participants: string[] = []
  for (let index = 0; index < participantCount; index += 1) {
    const name = readString(bytes, offset)
    if (name === null) {
      return null
    }
    participants.push(name)
  }

  let title = 'Shared receipt'
  if (flags & 1) {
    const parsedTitle = readString(bytes, offset)
    if (parsedTitle === null) {
      return null
    }
    title = parsedTitle || title
  }

  if (offset.index >= bytes.length) {
    return null
  }

  const itemCount = bytes[offset.index]
  offset.index += 1
  const items: ReceiptItem[] = []

  for (let index = 0; index < itemCount; index += 1) {
    const name = readString(bytes, offset)
    const priceCents = readVarint(bytes, offset)
    if (name === null || priceCents === null || offset.index >= bytes.length) {
      return null
    }

    const quantity = bytes[offset.index]
    offset.index += 1
    if (offset.index >= bytes.length) {
      return null
    }

    const shareEntryCount = bytes[offset.index]
    offset.index += 1
    if (offset.index + shareEntryCount * 2 > bytes.length) {
      return null
    }

    const shares: Record<string, number> = {}
    for (let entry = 0; entry < shareEntryCount; entry += 1) {
      const participantIdx = bytes[offset.index]
      const count = bytes[offset.index + 1]
      offset.index += 2
      const participant = participants[participantIdx]
      if (participant && count > 0) {
        shares[participant] = count
      }
    }

    items.push(
      createItem({
        name,
        price: priceCents > 0 ? centsToMoney(priceCents) : '',
        quantity: String(quantity || 1),
        shares,
      }),
    )
  }

  return readChargesAndNormalize(bytes, offset, flags, title, participants, items)
}

function readChargesAndNormalize(
  bytes: Uint8Array,
  offset: { index: number },
  flags: number,
  title: string,
  participants: string[],
  items: ReceiptItem[],
): ReceiptState | null {
  let tax = ''
  let tip = ''
  let fees = ''
  let discount = ''
  let payerVenmo = ''

  if (flags & 2) {
    const cents = readVarint(bytes, offset)
    if (cents === null) return null
    tax = centsToMoney(cents)
  }
  if (flags & 4) {
    const cents = readVarint(bytes, offset)
    if (cents === null) return null
    tip = centsToMoney(cents)
  }
  if (flags & 8) {
    const cents = readVarint(bytes, offset)
    if (cents === null) return null
    fees = centsToMoney(cents)
  }
  if (flags & 16) {
    const cents = readVarint(bytes, offset)
    if (cents === null) return null
    discount = centsToMoney(cents)
  }
  if (flags & 32) {
    const value = readString(bytes, offset)
    if (value === null) return null
    payerVenmo = value
  }

  return normalizeState({
    title,
    participants,
    items,
    tax,
    tip,
    fees,
    discount,
    payerVenmo,
  })
}

function unpackBinaryState(bytes: Uint8Array): ReceiptState | null {
  if (bytes.length < 3) {
    return null
  }

  const version = bytes[0]
  if (version === BINARY_VERSION_V2) {
    return unpackBinaryStateV2(bytes)
  }
  if (version === BINARY_VERSION_V1) {
    return unpackBinaryStateV1(bytes)
  }

  return null
}

function chooseSmallestPayload(bytes: Uint8Array): string {
  const candidates: Array<{ flag: number; body: Uint8Array }> = [
    { flag: 0, body: bytes },
    { flag: 1, body: deflateSync(bytes, { level: 9 }) },
  ]

  let best = ''
  for (const candidate of candidates) {
    const framed = new Uint8Array(candidate.body.length + 1)
    framed[0] = candidate.flag
    framed.set(candidate.body, 1)
    const encoded = encodeBaseAlphabet(framed, HASH_ALPHABET)
    if (!best || encoded.length < best.length) {
      best = encoded
    }
  }

  return best
}

function decodeBinaryPayload(encoded: string): ReceiptState | null {
  const decoded = decodeBaseAlphabet(encoded, HASH_ALPHABET)
  if (!decoded || decoded.length < 2) {
    return null
  }

  const flag = decoded[0]
  const body = decoded.subarray(1)

  try {
    if (flag === 0) {
      return unpackBinaryState(body)
    }
    if (flag === 1) {
      return unpackBinaryState(inflateSync(body))
    }
  } catch {
    return null
  }

  return null
}

type CompactItem = [string, string, string?, Array<string | number>?]
type CompactState = {
  t?: string
  p?: string[]
  i?: CompactItem[]
  x?: string
  y?: string
  f?: string
  d?: string
  v?: string
}

function sharesFromCompactAssignees(assignees: Array<string | number> | unknown): Record<string, number> {
  if (!Array.isArray(assignees)) {
    return {}
  }

  // Newer compact: ["Alice", 1, "Bob", 3]
  if (assignees.some((value) => typeof value === 'number')) {
    const shares: Record<string, number> = {}
    for (let index = 0; index < assignees.length; index += 2) {
      const name = assignees[index]
      const count = assignees[index + 1]
      if (typeof name === 'string' && name.trim()) {
        const parsed = typeof count === 'number' ? count : 1
        if (Number.isFinite(parsed) && parsed > 0) {
          shares[name] = Math.min(Math.floor(parsed), 255)
        }
      }
    }
    return shares
  }

  return sharesFromAssignees(
    assignees.filter((value): value is string => typeof value === 'string'),
  )
}

function fromCompactState(compact: CompactState): ReceiptState | null {
  const items = Array.isArray(compact.i)
    ? compact.i.map((entry) => {
        const [name = '', price = '', quantity = '', assignees = []] = Array.isArray(entry)
          ? entry
          : []
        return createItem({
          name: typeof name === 'string' ? name : '',
          price: typeof price === 'string' ? price : '',
          quantity: typeof quantity === 'string' && quantity ? quantity : '1',
          shares: sharesFromCompactAssignees(assignees),
        })
      })
    : []

  return normalizeState({
    title: typeof compact.t === 'string' && compact.t ? compact.t : 'Shared receipt',
    participants: Array.isArray(compact.p)
      ? compact.p.filter((value): value is string => typeof value === 'string')
      : [],
    items,
    tax: typeof compact.x === 'string' ? compact.x : '',
    tip: typeof compact.y === 'string' ? compact.y : '',
    fees: typeof compact.f === 'string' ? compact.f : '',
    discount: typeof compact.d === 'string' ? compact.d : '',
    payerVenmo: typeof compact.v === 'string' ? compact.v : '',
  })
}

function encodeIndexedItem(params: URLSearchParams, item: ReceiptItem, index: number) {
  const itemKey = `i${index}`
  if (item.name) params.set(`${itemKey}n`, item.name)
  if (item.price) params.set(`${itemKey}p`, item.price)
  if (item.quantity && item.quantity !== '1') params.set(`${itemKey}q`, item.quantity)
  for (const [assignee, count] of Object.entries(item.shares)) {
    if (!assignee || count <= 0) {
      continue
    }
    params.append(`${itemKey}a`, count === 1 ? assignee : `${assignee}:${count}`)
  }
}

function decodeAssigneeShare(value: string): { name: string; count: number } | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const separator = trimmed.lastIndexOf(':')
  if (separator > 0) {
    const name = trimmed.slice(0, separator)
    const count = Number.parseInt(trimmed.slice(separator + 1), 10)
    if (name && Number.isFinite(count) && count > 0) {
      return { name, count: Math.min(count, 255) }
    }
  }

  return { name: trimmed, count: 1 }
}

function decodeLegacyItem(value: string): ReceiptItem {
  const [name = '', price = '', quantity = '1', assignees = ''] = value.split(LEGACY_ITEM_SEPARATOR)
  const shares: Record<string, number> = {}
  for (const entry of assignees ? assignees.split(LEGACY_ASSIGNEE_SEPARATOR).filter(Boolean) : []) {
    const parsed = decodeAssigneeShare(entry)
    if (parsed) {
      shares[parsed.name] = parsed.count
    }
  }
  return createItem({
    name,
    price,
    quantity,
    shares,
  })
}

function readRawHash(): string {
  return window.location.hash.replace(/^#/, '')
}

function decodeLegacyParams(raw: string): ReceiptState | null {
  const params = new URLSearchParams(raw)
  if ([...params.keys()].length === 0) {
    return null
  }

  const indexes = Array.from(
    new Set(
      [...params.keys()]
        .map((key) => key.match(/^i(\d+)[npqa]$/)?.[1])
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => Number(left) - Number(right))

  const indexedItems = indexes.map((index) => {
    const prefix = `i${index}`
    const shares: Record<string, number> = {}
    for (const entry of params.getAll(`${prefix}a`).filter(Boolean)) {
      const parsed = decodeAssigneeShare(entry)
      if (parsed) {
        shares[parsed.name] = parsed.count
      }
    }
    return createItem({
      name: params.get(`${prefix}n`) ?? '',
      price: params.get(`${prefix}p`) ?? '',
      quantity: params.get(`${prefix}q`) ?? '1',
      shares,
    })
  })
  const legacyItems = params.getAll('item').map(decodeLegacyItem)

  return normalizeState({
    title: params.get('title') ?? 'Shared receipt',
    participants: params.getAll('person'),
    items: indexedItems.length > 0 ? indexedItems : legacyItems,
    tax: params.get('tax') ?? '',
    tip: params.get('tip') ?? '',
    fees: params.get('fees') ?? '',
    discount: params.get('discount') ?? '',
    payerVenmo: params.get('venmo') ?? '',
  })
}

function decodeDenseTextPayload(payload: string): ReceiptState | null {
  const [
    title = '',
    participantsRaw = '',
    itemsRaw = '',
    tax = '',
    tip = '',
    fees = '',
    discount = '',
    payerVenmo = '',
  ] = payload.split(RECORD_SEP)

  const participants = participantsRaw ? participantsRaw.split(UNIT_SEP).filter(Boolean) : []
  const items = itemsRaw
    ? itemsRaw.split('\n').filter(Boolean).map((line) => {
        const [name = '', price = '', quantity = '', assigneeIndexes = ''] = line.split(UNIT_SEP)
        const shares: Record<string, number> = {}
        if (assigneeIndexes) {
          for (const entry of assigneeIndexes.split(',')) {
            const [indexRaw, countRaw] = entry.split('x')
            const participant = participants[Number(indexRaw)]
            const count = countRaw ? Number.parseInt(countRaw, 10) : 1
            if (participant && Number.isFinite(count) && count > 0) {
              shares[participant] = Math.min(count, 255)
            }
          }
        }
        return createItem({
          name,
          price,
          quantity: quantity || '1',
          shares,
        })
      })
    : []

  return normalizeState({
    title: title || 'Shared receipt',
    participants,
    items,
    tax,
    tip,
    fees,
    discount,
    payerVenmo,
  })
}

function decodeDeflateTextHash(raw: string): ReceiptState | null {
  if (!raw.startsWith(DATA_PREFIX)) {
    return null
  }

  const bytes = fromBase64Url(raw.slice(DATA_PREFIX.length))
  if (!bytes) {
    return null
  }

  try {
    return decodeDenseTextPayload(new TextDecoder().decode(inflateSync(bytes)))
  } catch {
    return null
  }
}

function decodeLzHash(raw: string): ReceiptState | null {
  if (!raw.startsWith(LZ_PREFIX)) {
    return null
  }

  const json = decompressFromEncodedURIComponent(raw.slice(LZ_PREFIX.length))
  if (!json) {
    return null
  }

  try {
    return fromCompactState(JSON.parse(json) as CompactState)
  } catch {
    return null
  }
}

function finalizeState(state: ReceiptState | null): ReceiptState | null {
  if (!state) {
    return null
  }

  return {
    ...state,
    items: state.items.length > 0 ? state.items : [createItem()],
  }
}

function encodeReadableTitle(title: string): string {
  // Keep the title human-readable; use + for spaces so links survive copy/paste.
  // Encode colon so iMessage does not treat it as a new URL scheme.
  return title
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/&/g, '%26')
    .replace(/:/g, '%3A')
    .replace(/ /g, '+')
}

function decodeReadableTitle(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value.replace(/\+/g, ' ')
  }
}

function getReadableTitle(state: ReceiptState): string {
  const title = state.title.trim()
  return title && title !== 'Shared receipt' ? title : ''
}

function isAlphanumericPayload(value: string): boolean {
  return /^[A-Za-z0-9]+$/.test(value)
}

/** Hybrid: title=<readable>&d<payload> (or just d<payload>). Older links use d:. */
function encodeHybridHash(state: ReceiptState): string {
  const packed = packBinaryState(state, { includeTitle: false })
  const payload = `${DATA_MARKER}${chooseSmallestPayload(packed)}`
  const title = getReadableTitle(state)
  if (!title) {
    return payload
  }
  return `${TITLE_PARAM}${encodeReadableTitle(title)}&${payload}`
}

function parseHybridHash(raw: string): { title: string | null; payload: string } | null {
  const oldIndex = raw.indexOf(DATA_PREFIX)
  if (oldIndex === 0) {
    return { title: null, payload: raw.slice(DATA_PREFIX.length) }
  }
  if (oldIndex !== -1 && raw.startsWith(TITLE_PARAM) && raw.slice(0, oldIndex).endsWith('&')) {
    return {
      title: decodeReadableTitle(raw.slice(TITLE_PARAM.length, oldIndex - 1)),
      payload: raw.slice(oldIndex + DATA_PREFIX.length),
    }
  }

  if (raw.startsWith(DATA_MARKER) && isAlphanumericPayload(raw.slice(DATA_MARKER.length))) {
    return { title: null, payload: raw.slice(DATA_MARKER.length) }
  }

  if (raw.startsWith(TITLE_PARAM)) {
    const separator = raw.indexOf('&')
    if (separator !== -1) {
      const rest = raw.slice(separator + 1)
      if (rest.startsWith(DATA_MARKER) && isAlphanumericPayload(rest.slice(DATA_MARKER.length))) {
        return {
          title: decodeReadableTitle(raw.slice(TITLE_PARAM.length, separator)),
          payload: rest.slice(DATA_MARKER.length),
        }
      }
    }
  }

  return null
}

function applyReadableTitle(state: ReceiptState | null, title: string | null): ReceiptState | null {
  if (!state || !title) {
    return state
  }
  return { ...state, title }
}

export function readHashState(): ReceiptState | null {
  const rawHash = readRawHash()
  if (!rawHash) {
    const searchParams = new URLSearchParams(window.location.search)
    if ([...searchParams.keys()].length === 0) {
      return null
    }
    return finalizeState(decodeLegacyParams(searchParams.toString()))
  }

  const hybrid = parseHybridHash(rawHash)
  if (hybrid) {
    const fromBinary = applyReadableTitle(
      decodeBinaryPayload(hybrid.payload),
      hybrid.title,
    )
    if (fromBinary) {
      return finalizeState(fromBinary)
    }

    // Old whole-hash d:<base64> deflate-text links (no title= wrapper).
    if (!hybrid.title) {
      const fromDeflateText = decodeDeflateTextHash(rawHash)
      if (fromDeflateText) {
        return finalizeState(fromDeflateText)
      }
    }
  }

  if (rawHash.startsWith(BINARY_PREFIX)) {
    return finalizeState(decodeBinaryPayload(rawHash.slice(BINARY_PREFIX.length)))
  }

  return (
    finalizeState(decodeLzHash(rawHash))
    ?? finalizeState(decodeLegacyParams(rawHash))
  )
}

function encodeLegacyHashState(state: ReceiptState): string {
  const params = new URLSearchParams()
  if (state.title) params.set('title', state.title)
  for (const participant of state.participants.filter(Boolean)) {
    params.append('person', participant)
  }
  for (const [index, item] of state.items.entries()) {
    if (item.name || item.price || getShareTotal(item.shares) > 0 || item.quantity !== '1') {
      encodeIndexedItem(params, item, index)
    }
  }
  if (state.tax) params.set('tax', state.tax)
  if (state.tip) params.set('tip', state.tip)
  if (state.fees) params.set('fees', state.fees)
  if (state.discount) params.set('discount', state.discount)
  if (state.payerVenmo) params.set('venmo', state.payerVenmo)
  return params.toString()
}

function isEmptyState(state: ReceiptState): boolean {
  return (
    (!state.title || state.title === 'Shared receipt')
    && state.participants.every((name) => !name.trim())
    && state.items.every(
      (item) => !item.name && !item.price && item.quantity === '1' && getShareTotal(item.shares) === 0,
    )
    && !state.tax
    && !state.tip
    && !state.fees
    && !state.discount
    && !state.payerVenmo
  )
}

export function encodeHashState(state: ReceiptState): string {
  if (isEmptyState(state)) {
    return ''
  }

  try {
    return encodeHybridHash(state)
  } catch {
    return encodeLegacyHashState(state)
  }
}

export function createSummaryPath(state: ReceiptState): string {
  const serialized = encodeHashState(state)
  return serialized ? `/summary#${serialized}` : '/summary'
}

export function createSummaryLocation(state: ReceiptState): {
  pathname: string
  hash: string
} {
  const serialized = encodeHashState(state)
  return {
    pathname: '/summary',
    hash: serialized ? `#${serialized}` : '',
  }
}

export function createShareUrl(state: ReceiptState): string {
  const serialized = encodeHashState(state)
  const rootPath = getAppRootPath()
  return serialized
    ? `${window.location.origin}${rootPath}/#${serialized}`
    : `${window.location.origin}${rootPath}/`
}

export function createSummaryUrl(state: ReceiptState): string {
  const serialized = encodeHashState(state)
  const rootPath = getAppRootPath()
  return serialized
    ? `${window.location.origin}${rootPath}${createSummaryPath(state)}`
    : `${window.location.origin}${rootPath}/summary`
}
