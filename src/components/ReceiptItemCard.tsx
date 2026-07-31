import type { ReceiptItem } from '../types'
import { formatMoney, getShareTotal, parseMoneyInput, parseQuantity } from '../utils/receipt'

type ReceiptItemCardProps = {
  index: number
  item: ReceiptItem
  participants: string[]
  onUpdateItem: (itemId: string, field: keyof ReceiptItem, value: string | Record<string, number>) => void
  onRemoveItem: (itemId: string) => void
  onSetShare: (itemId: string, participant: string, count: number) => void
}

export default function ReceiptItemCard({
  index,
  item,
  participants,
  onUpdateItem,
  onRemoveItem,
  onSetShare,
}: ReceiptItemCardProps) {
  const quantity = parseQuantity(item.quantity)
  const unitPrice = parseMoneyInput(item.price)
  const total = quantity * unitPrice
  const shareTotal = getShareTotal(item.shares)
  const hasUnevenShares = Object.values(item.shares).some((count) => count !== 1)

  return (
    <article className="space-y-2 rounded bg-inset p-3">
      <input
        value={item.name}
        onChange={(event) => onUpdateItem(item.id, 'name', event.target.value)}
        className="w-full rounded bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
        placeholder={`Item ${index + 1}`}
      />
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <label className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-fg-muted">
            $
          </span>
          <input
            value={item.price}
            onChange={(event) => onUpdateItem(item.id, 'price', event.target.value)}
            inputMode="decimal"
            pattern="^\d*(?:\.\d{0,2})?$"
            className="w-full rounded bg-app py-2 pr-3 pl-7 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="0.00"
          />
        </label>
        <input
          value={item.quantity}
          onChange={(event) => onUpdateItem(item.id, 'quantity', event.target.value)}
          inputMode="numeric"
          pattern="^\d*$"
          className="w-[88px] shrink-0 rounded bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Qty"
        />
        <button
          type="button"
          onClick={() => onRemoveItem(item.id)}
          className="w-full rounded-app border border-border bg-surface px-3 py-2 text-sm text-fg hover:bg-app sm:w-auto sm:shrink-0"
        >
          Remove
        </button>
      </div>

      {participants.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium tracking-wide text-fg-muted uppercase">
            Who got what
          </p>
          <div className="space-y-1">
            {participants.map((participant) => {
              const count = item.shares[participant] ?? 0
              const amount =
                count > 0 && shareTotal > 0 ? (count / shareTotal) * total : 0

              if (count <= 0) {
                return (
                  <button
                    key={`${item.id}-${participant}`}
                    type="button"
                    onClick={() => onSetShare(item.id, participant, 1)}
                    className="flex w-full items-center justify-between rounded bg-surface px-3 py-2 text-left text-sm text-fg-secondary hover:bg-app"
                  >
                    <span>{participant}</span>
                    <span className="text-xs text-fg-muted">Add</span>
                  </button>
                )
              }

              return (
                <div
                  key={`${item.id}-${participant}`}
                  className="flex items-center gap-2 rounded bg-app px-2 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => onSetShare(item.id, participant, 0)}
                    className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left text-sm text-fg hover:text-fg-muted"
                    title={`Remove ${participant}`}
                  >
                    {participant}
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onSetShare(item.id, participant, count - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded text-base text-fg-secondary hover:bg-inset"
                      aria-label={`Fewer for ${participant}`}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium tabular-nums text-fg">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSetShare(item.id, participant, count + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded text-base text-fg-secondary hover:bg-inset"
                      aria-label={`More for ${participant}`}
                    >
                      +
                    </button>
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-fg-muted">
                    {formatMoney(amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">Add people to assign this item.</p>
      )}

      <div className="flex items-center justify-between text-sm text-fg-muted">
        <span>{formatMoney(total)}</span>
        <span>
          {shareTotal > 0
            ? hasUnevenShares
              ? quantity > 1
                ? `${shareTotal} of ${quantity}`
                : `${shareTotal} share${shareTotal === 1 ? '' : 's'}`
              : `${formatMoney(total / shareTotal)} each`
            : 'Unassigned'}
        </span>
      </div>
    </article>
  )
}
