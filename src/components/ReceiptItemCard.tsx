import type { ReceiptItem } from '../types'
import { formatMoney, parseMoneyInput, parseQuantity } from '../utils/receipt'

type ReceiptItemCardProps = {
  index: number
  item: ReceiptItem
  participants: string[]
  onUpdateItem: (itemId: string, field: keyof ReceiptItem, value: string | string[]) => void
  onRemoveItem: (itemId: string) => void
  onToggleAssignee: (itemId: string, participant: string) => void
}

export default function ReceiptItemCard({
  index,
  item,
  participants,
  onUpdateItem,
  onRemoveItem,
  onToggleAssignee,
}: ReceiptItemCardProps) {
  const total = parseQuantity(item.quantity) * parseMoneyInput(item.price)

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

      <div className="flex flex-wrap gap-2">
        {participants.length > 0 ? (
          participants.map((participant) => {
            const selected = item.assignees.includes(participant)
            return (
              <button
                key={`${item.id}-${participant}`}
                type="button"
                onClick={() => onToggleAssignee(item.id, participant)}
                className={`rounded px-3 py-1.5 text-sm ${selected
                    ? 'bg-accent text-accent-contrast'
                    : 'bg-surface text-fg-secondary hover:bg-app'
                  }`}
              >
                {participant}
              </button>
            )
          })
        ) : (
          <p className="text-sm text-fg-muted">Add people to assign this item.</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-fg-muted">
        <span>{formatMoney(total)}</span>
        <span>
          {item.assignees.length > 0
            ? `${formatMoney(total / item.assignees.length)} each`
            : 'Unassigned'}
        </span>
      </div>
    </article>
  )
}