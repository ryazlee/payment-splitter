import type { ReceiptItem } from '../types'
import { formatMoney, getShareTotal, parseMoneyInput, parseQuantity } from '../utils/receipt'
import Button from './Button'

type ShareMode = 'equal' | 'assign' | 'none'

type ReceiptItemCardProps = {
  index: number
  item: ReceiptItem
  participants: string[]
  shareMode: ShareMode
  onUpdateItem: (itemId: string, field: keyof ReceiptItem, value: string | Record<string, number>) => void
  onRemoveItem: (itemId: string) => void
  onSetShare: (itemId: string, participant: string, count: number) => void
  onSplitEqually: (itemId: string) => void
}

export default function ReceiptItemCard({
  index,
  item,
  participants,
  shareMode,
  onUpdateItem,
  onRemoveItem,
  onSetShare,
  onSplitEqually,
}: ReceiptItemCardProps) {
  const quantity = parseQuantity(item.quantity)
  const unitPrice = parseMoneyInput(item.price)
  const total = quantity * unitPrice
  const shareTotal = getShareTotal(item.shares)
  const remaining = Math.max(quantity - shareTotal, 0)
  const splitCount = Object.values(item.shares).filter((count) => count > 0).length
  const equalAmount = shareMode === 'equal' && splitCount > 0 && total > 0 ? total / splitCount : 0
  const everyoneIncluded =
    participants.length > 0 && participants.every((name) => (item.shares[name] ?? 0) > 0)

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

      {shareMode === 'none' ? null : participants.length > 0 ? (
        shareMode === 'equal' ? (
          <div className="stack stack--tight">
            <div className="item-card__split-header">
              <p className="section-label">Split equally</p>
              {!everyoneIncluded ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onSplitEqually(item.id)}
                >
                  Include everyone
                </button>
              ) : null}
            </div>
            <div className="chip-row">
              {participants.map((participant) => {
                const included = (item.shares[participant] ?? 0) > 0
                return (
                  <button
                    key={`${item.id}-${participant}`}
                    type="button"
                    className={included ? 'chip chip--active' : 'chip'}
                    onClick={() => onSetShare(item.id, participant, included ? 0 : 1)}
                  >
                    {participant}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="stack stack--tight">
            <p className="section-label">Who got what</p>
            <div className="share-list">
              {participants.map((participant) => {
                const count = item.shares[participant] ?? 0
                const amount = count > 0 && quantity > 0 ? (count / quantity) * total : 0
                const canIncrease = remaining > 0

                if (count <= 0) {
                  return (
                    <button
                      key={`${item.id}-${participant}`}
                      type="button"
                      onClick={() => onSetShare(item.id, participant, 1)}
                      disabled={!canIncrease}
                      className="share-row"
                    >
                      <span>{participant}</span>
                      <span className="meta meta--muted meta--sm">
                        {canIncrease ? 'Add' : 'Full'}
                      </span>
                    </button>
                  )
                }

                return (
                  <div
                    key={`${item.id}-${participant}`}
                    className="share-row share-row--active"
                  >
                    <button
                      type="button"
                      onClick={() => onSetShare(item.id, participant, 0)}
                      className="share-row__name"
                      title={`Remove ${participant}`}
                    >
                      {participant}
                    </button>
                    <div className="share-row__stepper">
                      <button
                        type="button"
                        onClick={() => onSetShare(item.id, participant, count - 1)}
                        className="share-row__step"
                        aria-label={`Fewer for ${participant}`}
                      >
                        −
                      </button>
                      <span className="share-row__count">{count}</span>
                      <button
                        type="button"
                        onClick={() => onSetShare(item.id, participant, count + 1)}
                        disabled={!canIncrease}
                        className="share-row__step"
                        aria-label={`More for ${participant}`}
                      >
                        +
                      </button>
                    </div>
                    <span className="share-row__amount">{formatMoney(amount)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      ) : (
        <p className="empty-hint">
          {shareMode === 'equal'
            ? 'Add people to split this equally.'
            : 'Add people to assign this item.'}
        </p>
      )}

      <div className="item-card__footer">
        <span>{formatMoney(total)}</span>
        <span>
          {shareMode === 'equal'
            ? splitCount > 0
              ? `${formatMoney(equalAmount)} each · ${splitCount} splitting`
              : 'Unassigned'
            : shareMode === 'assign'
              ? shareTotal > 0
                ? `${shareTotal} of ${quantity}`
                : 'Unassigned'
              : 'Add a name or price to include this item'}
        </span>
      </div>
    </article>
  )
}
