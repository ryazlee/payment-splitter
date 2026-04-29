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
    <article className="space-y-2 rounded bg-gray-700 p-3">
      <input
        value={item.name}
        onChange={(event) => onUpdateItem(item.id, 'name', event.target.value)}
        className="w-full rounded bg-gray-600 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
        placeholder={`Item ${index + 1}`}
      />
      <div className="grid grid-cols-[1fr_80px_88px] gap-2">
        <input
          value={item.price}
          onChange={(event) => onUpdateItem(item.id, 'price', event.target.value)}
          inputMode="decimal"
          className="rounded bg-gray-600 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
          placeholder="Price"
        />
        <input
          value={item.quantity}
          onChange={(event) => onUpdateItem(item.id, 'quantity', event.target.value)}
          inputMode="decimal"
          className="rounded bg-gray-600 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
          placeholder="Qty"
        />
        <button
          type="button"
          onClick={() => onRemoveItem(item.id)}
          className="rounded bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-900"
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
                    ? 'bg-white text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-900'
                  }`}
              >
                {participant}
              </button>
            )
          })
        ) : (
          <p className="text-sm text-gray-400">Add people to assign this item.</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400">
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