import type { ReceiptItem } from '../types'
import {
  formatMoney,
  getShareTotal,
  isEqualSplitItem,
  parseMoneyInput,
  parseQuantity,
} from '../utils/receipt'
import Button from './Button'

function assignmentStatus(
  splitCount: number,
  shareTotal: number,
  total: number,
): string {
  if (splitCount <= 0) {
    return 'Unassigned'
  }

  if (total > 0 && splitCount === shareTotal) {
    return `${formatMoney(total / splitCount)} each · ${splitCount} splitting`
  }

  return `${splitCount} splitting`
}

type PersonChipProps = {
  itemId: string
  participant: string
  count: number
  quantity: number
  onSetShare: (itemId: string, participant: string, count: number) => void
}

function PersonChip({ itemId, participant, count, quantity, onSetShare }: PersonChipProps) {
  const included = count > 0
  const canWeight = quantity > 1 && included

  if (!canWeight) {
    return (
      <button
        type="button"
        className={included ? 'chip chip--active' : 'chip'}
        onClick={() => onSetShare(itemId, participant, included ? 0 : 1)}
      >
        {participant}
      </button>
    )
  }

  return (
    <div className="chip chip--active chip--share">
      {count > 1 ? (
        <button
          type="button"
          className="chip__step"
          onClick={() => onSetShare(itemId, participant, count - 1)}
          aria-label={`Fewer for ${participant}`}
        >
          −
        </button>
      ) : null}
      <button
        type="button"
        className="chip__name"
        onClick={() => onSetShare(itemId, participant, 0)}
        title={`Remove ${participant}`}
      >
        {participant}
        {count > 1 ? ` · ${count}` : ''}
      </button>
      <button
        type="button"
        className="chip__step"
        onClick={() => onSetShare(itemId, participant, count + 1)}
        disabled={count >= quantity}
        aria-label={`More for ${participant}`}
      >
        +
      </button>
    </div>
  )
}

type ReceiptItemCardProps = {
  index: number
  item: ReceiptItem
  participants: string[]
  onUpdateItem: (itemId: string, field: keyof ReceiptItem, value: string | Record<string, number>) => void
  onRemoveItem: (itemId: string) => void
  onSetShare: (itemId: string, participant: string, count: number) => void
  onSplitEqually: (itemId: string) => void
}

export default function ReceiptItemCard({
  index,
  item,
  participants,
  onUpdateItem,
  onRemoveItem,
  onSetShare,
  onSplitEqually,
}: ReceiptItemCardProps) {
  const quantity = parseQuantity(item.quantity)
  const unitPrice = parseMoneyInput(item.price)
  const total = quantity * unitPrice
  const shareTotal = getShareTotal(item.shares)
  const equalSplit = isEqualSplitItem(item)
  const splitCount = Object.values(item.shares).filter((count) => count > 0).length
  const everyoneIncluded =
    participants.length > 0 && participants.every((name) => (item.shares[name] ?? 0) > 0)
  const unevenAmounts =
    !equalSplit && splitCount > 0 && shareTotal !== splitCount
      ? participants
          .filter((name) => (item.shares[name] ?? 0) > 0)
          .map((name) => {
            const count = item.shares[name] ?? 0
            const amount = shareTotal > 0 ? (count / shareTotal) * total : 0
            return `${name} ${formatMoney(amount)}`
          })
          .join(' · ')
      : ''

  return (
    <article className="inset-block item-card">
      <input
        value={item.name}
        onChange={(event) => onUpdateItem(item.id, 'name', event.target.value)}
        className="input input--on-inset"
        placeholder={`Item ${index + 1}`}
      />
      <div className="item-card__fields">
        <div className="input-affix input--on-inset">
          <span className="input-affix__prefix">$</span>
          <input
            value={item.price}
            onChange={(event) => onUpdateItem(item.id, 'price', event.target.value)}
            inputMode="decimal"
            pattern="^\d*(?:\.\d{0,2})?$"
            placeholder="0.00"
            aria-label="Price"
          />
        </div>
        <input
          value={item.quantity}
          onChange={(event) => onUpdateItem(item.id, 'quantity', event.target.value)}
          inputMode="numeric"
          pattern="^\d*$"
          className="input input--on-inset item-card__qty"
          placeholder="Qty"
          aria-label="Quantity"
        />
        <Button
          label="Remove"
          variant="secondary"
          size="sm"
          className="item-card__remove"
          onClick={() => onRemoveItem(item.id)}
        />
      </div>

      {participants.length > 0 ? (
        <div className="stack stack--tight">
          <div className="item-card__split-header">
            <p className="section-label">Split with</p>
            {!everyoneIncluded ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onSplitEqually(item.id)}
              >
                Everyone
              </button>
            ) : null}
          </div>
          <div className="chip-row">
            {participants.map((participant) => (
              <PersonChip
                key={`${item.id}-${participant}`}
                itemId={item.id}
                participant={participant}
                count={item.shares[participant] ?? 0}
                quantity={quantity}
                onSetShare={onSetShare}
              />
            ))}
          </div>
          {unevenAmounts ? (
            <p className="meta meta--muted meta--sm">{unevenAmounts}</p>
          ) : null}
        </div>
      ) : (
        <p className="empty-hint">Add people to split this.</p>
      )}

      <div className="item-card__footer">
        <span>{formatMoney(total)}</span>
        <span>{assignmentStatus(splitCount, shareTotal, total)}</span>
      </div>
    </article>
  )
}
