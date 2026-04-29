import ReceiptItemCard from './ReceiptItemCard'
import type { ReceiptItem } from '../types'

type ItemsPanelProps = {
  items: ReceiptItem[]
  participants: string[]
  onAddItem: () => void
  onUpdateItem: (itemId: string, field: keyof ReceiptItem, value: string | string[]) => void
  onRemoveItem: (itemId: string) => void
  onToggleAssignee: (itemId: string, participant: string) => void
}

export default function ItemsPanel({
  items,
  participants,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onToggleAssignee,
}: ItemsPanelProps) {
  return (
    <section className="space-y-3 rounded bg-gray-800 p-4">
      <h2 className="text-sm text-gray-300">Items</h2>

      <div className="space-y-2">
        {items.map((item, index) => (
          <ReceiptItemCard
            key={item.id}
            index={index}
            item={item}
            participants={participants}
            onUpdateItem={onUpdateItem}
            onRemoveItem={onRemoveItem}
            onToggleAssignee={onToggleAssignee}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAddItem}
        className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
      >
        Add item
      </button>
    </section>
  )
}