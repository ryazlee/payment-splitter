import ReceiptItemCard from './ReceiptItemCard'
import type { ReceiptItem } from '../types'

type ItemsPanelProps = {
  items: ReceiptItem[]
  participants: string[]
  onAddItem: () => void
  onUpdateItem: (itemId: string, field: keyof ReceiptItem, value: string | Record<string, number>) => void
  onRemoveItem: (itemId: string) => void
  onSetShare: (itemId: string, participant: string, count: number) => void
}

export default function ItemsPanel({
  items,
  participants,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onSetShare,
}: ItemsPanelProps) {
  return (
    <section className="space-y-3 rounded-app border border-border bg-surface p-4">
      <h2 className="section-label">Items</h2>

      <div className="space-y-2">
        {items.map((item, index) => (
          <ReceiptItemCard
            key={item.id}
            index={index}
            item={item}
            participants={participants}
            onUpdateItem={onUpdateItem}
            onRemoveItem={onRemoveItem}
            onSetShare={onSetShare}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAddItem}
        className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-fg hover:bg-inset"
      >
        Add item
      </button>
    </section>
  )
}
