import type { ReceiptItem, ReceiptState } from '../types'
import { createItem, normalizeState } from './receipt'

const LEGACY_ITEM_SEPARATOR = '~'
const LEGACY_ASSIGNEE_SEPARATOR = '|'

function encodeIndexedItem(params: URLSearchParams, item: ReceiptItem, index: number) {
  const itemKey = `i${index}`

  if (item.name) {
    params.set(`${itemKey}n`, item.name)
  }
  if (item.price) {
    params.set(`${itemKey}p`, item.price)
  }
  if (item.quantity && item.quantity !== '1') {
    params.set(`${itemKey}q`, item.quantity)
  }
  for (const assignee of item.assignees.filter(Boolean)) {
    params.append(`${itemKey}a`, assignee)
  }
}

function decodeLegacyItem(value: string): ReceiptItem {
  const [name = '', price = '', quantity = '1', assignees = ''] = value.split(LEGACY_ITEM_SEPARATOR)
  return createItem({
    name,
    price,
    quantity,
    assignees: assignees ? assignees.split(LEGACY_ASSIGNEE_SEPARATOR).filter(Boolean) : [],
  })
}

function readStateParams(): URLSearchParams {
  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  if ([...hashParams.keys()].length > 0) {
    return hashParams
  }

  return new URLSearchParams(window.location.search)
}

function decodeIndexedItems(params: URLSearchParams): ReceiptItem[] {
  const indexes = Array.from(
    new Set(
      [...params.keys()]
        .map((key) => key.match(/^i(\d+)[npqa]$/)?.[1])
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => Number(left) - Number(right))

  return indexes.map((index) => {
    const prefix = `i${index}`
    return createItem({
      name: params.get(`${prefix}n`) ?? '',
      price: params.get(`${prefix}p`) ?? '',
      quantity: params.get(`${prefix}q`) ?? '1',
      assignees: params.getAll(`${prefix}a`).filter(Boolean),
    })
  })
}

export function readHashState(): ReceiptState | null {
  const params = readStateParams()
  if ([...params.keys()].length === 0) {
    return null
  }

  const indexedItems = decodeIndexedItems(params)
  const legacyItems = params.getAll('item').map(decodeLegacyItem)

  const state = normalizeState({
    title: params.get('title') ?? 'Shared receipt',
    participants: params.getAll('person'),
    items: indexedItems.length > 0 ? indexedItems : legacyItems,
    tax: params.get('tax') ?? '',
    tip: params.get('tip') ?? '',
    fees: params.get('fees') ?? '',
    discount: params.get('discount') ?? '',
  })

  if (!state) {
    return null
  }

  return {
    ...state,
    items: state.items.length > 0 ? state.items : [createItem()],
  }
}

export function encodeHashState(state: ReceiptState): string {
  const params = new URLSearchParams()
  if (state.title) {
    params.set('title', state.title)
  }

  for (const participant of state.participants.filter(Boolean)) {
    params.append('person', participant)
  }

  for (const [index, item] of state.items.entries()) {
    if (item.name || item.price || item.assignees.length > 0 || item.quantity !== '1') {
      encodeIndexedItem(params, item, index)
    }
  }

  if (state.tax) {
    params.set('tax', state.tax)
  }
  if (state.tip) {
    params.set('tip', state.tip)
  }
  if (state.fees) {
    params.set('fees', state.fees)
  }
  if (state.discount) {
    params.set('discount', state.discount)
  }

  return params.toString()
}

export function createShareUrl(state: ReceiptState): string {
  const serialized = encodeHashState(state)
  const { origin, pathname } = window.location

  return serialized ? `${origin}${pathname}#${serialized}` : `${origin}${pathname}`
}