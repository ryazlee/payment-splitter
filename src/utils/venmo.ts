import { formatMoney } from './receipt'

type VenmoPayParams = {
  recipient: string
  amount: string
  note: string
}

function getVenmoPayParams(
  handle: string,
  amount: number,
  note: string,
): VenmoPayParams | null {
  const recipient = normalizeVenmoHandle(handle)
  if (!recipient || amount <= 0) {
    return null
  }

  return {
    recipient,
    amount: amount.toFixed(2),
    note: note.trim().slice(0, 200),
  }
}

export function normalizeVenmoHandle(value: string): string {
  return value.trim().replace(/^@+/, '').replace(/\s+/g, '')
}

/** Web link for copied text — tappable in iMessage/SMS and opens app on many phones. */
export function buildVenmoWebPayUrl(
  handle: string,
  amount: number,
  note: string,
): string | null {
  const params = getVenmoPayParams(handle, amount, note)
  if (!params) {
    return null
  }

  const query = new URLSearchParams({
    txn: 'pay',
    amount: params.amount,
    note: params.note,
  })

  return `https://venmo.com/${encodeURIComponent(params.recipient)}?${query.toString()}`
}

/** Native app scheme — most reliable when tapped from an in-app button on mobile. */
export function buildVenmoAppPayUrl(
  handle: string,
  amount: number,
  note: string,
): string | null {
  const params = getVenmoPayParams(handle, amount, note)
  if (!params) {
    return null
  }

  const query = new URLSearchParams({
    txn: 'pay',
    recipients: params.recipient,
    amount: params.amount,
    note: params.note,
  })

  return `venmo://paycharge?${query.toString()}`
}

/** @deprecated Use buildVenmoWebPayUrl instead. */
export function buildVenmoPayUrl(
  handle: string,
  amount: number,
  note: string,
): string | null {
  return buildVenmoWebPayUrl(handle, amount, note)
}

export function buildVenmoPaymentNote(receiptTitle: string, participant: string): string {
  const title = receiptTitle.trim() || 'Receipt split'
  return `${title} - ${participant}`
}

export function buildVenmoPayLinkLabel(amount: number, handle: string): string {
  const recipient = normalizeVenmoHandle(handle)
  if (!recipient) {
    return 'Pay on Venmo'
  }

  return `Pay ${formatMoney(amount)} to @${recipient}`
}
