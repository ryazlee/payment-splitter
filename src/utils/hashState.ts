import type { ReceiptItem, ReceiptState } from '../types'
import { createItem, normalizeState } from './receipt'

const ITEM_SEPARATOR = '~'
const ASSIGNEE_SEPARATOR = '|'

function encodeItem(item: ReceiptItem): string {
  return [item.name, item.price, item.quantity, item.assignees.join(ASSIGNEE_SEPARATOR)].join(
    ITEM_SEPARATOR,
  )
}

function decodeItem(value: string): ReceiptItem {
  const [name = '', price = '', quantity = '1', assignees = ''] = value.split(ITEM_SEPARATOR)
  return createItem({
    name,
    price,
    quantity,
    assignees: assignees ? assignees.split(ASSIGNEE_SEPARATOR).filter(Boolean) : [],
  })
}

export function readHashState(): ReceiptState | null {
  const params = new URLSearchParams(window.location.hash.slice(1))
  if ([...params.keys()].length === 0) {
    return null
  }

  const state = normalizeState({
    title: params.get('title') ?? 'Shared receipt',
    participants: params.getAll('person'),
    items: params.getAll('item').map(decodeItem),
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

  for (const item of state.items) {
    if (item.name || item.price || item.assignees.length > 0 || item.quantity !== '1') {
      params.append('item', encodeItem(item))
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