import ReceiptItemCard from './ReceiptItemCard'
import Button from './Button'
import SectionCard from './SectionCard'
import type { ReceiptItem } from '../types'
import { equalSplitItemIndex, isEqualSplitReceipt } from '../utils/receipt'

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
  const splitTargetIndex = equalSplit ? equalSplitItemIndex(items) : -1

  return (
    <SectionCard
      title="Items"
      subtitle={
        equalSplit
          ? 'One filled item — split it equally. Add another item to assign shares per person.'
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
              shareMode={
                equalSplit
                  ? index === splitTargetIndex
                    ? 'equal'
                    : 'none'
                  : 'assign'
              }
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
