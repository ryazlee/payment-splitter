import ReceiptItemCard from './ReceiptItemCard'
import Button from './Button'
import SectionCard from './SectionCard'
import type { ReceiptItem } from '../types'
import { isEqualSplitReceipt } from '../utils/receipt'

type ItemsPanelProps = {
  items: ReceiptItem[]
  participants: string[]
  onAddItem: () => void
  onUpdateItem: (itemId: string, field: keyof ReceiptItem, value: string | Record<string, number>) => void
  onRemoveItem: (itemId: string) => void
  onSetShare: (itemId: string, participant: string, count: number) => void
  onSplitEqually: (itemId: string) => void
}

export default function ItemsPanel({
  items,
  participants,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onSetShare,
  onSplitEqually,
}: ItemsPanelProps) {
  const equalSplit = isEqualSplitReceipt(items)

  return (
    <SectionCard
      title="Items"
      subtitle={
        equalSplit
          ? 'One item — split the total equally among the people you include.'
          : 'Assign shares to the people who ordered each item.'
      }
    >
      <div className="stack">
        <div className="stack stack--tight">
          {items.map((item, index) => (
            <ReceiptItemCard
              key={item.id}
              index={index}
              item={item}
              participants={participants}
              equalSplit={equalSplit}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
              onSetShare={onSetShare}
              onSplitEqually={onSplitEqually}
            />
          ))}
        </div>

        <Button label="Add item" variant="secondary" block onClick={onAddItem} />
      </div>
    </SectionCard>
  )
}
