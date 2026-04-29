type ChargesPanelProps = {
  tax: string
  tip: string
  fees: string
  discount: string
  onChargeChange: (field: 'tax' | 'tip' | 'fees' | 'discount', value: string) => void
}

export default function ChargesPanel({
  tax,
  tip,
  fees,
  discount,
  onChargeChange,
}: ChargesPanelProps) {
  return (
    <section className="space-y-3 rounded bg-gray-800 p-4">
      <h2 className="text-sm text-gray-300">Charges</h2>
      <div className="flex flex-wrap gap-2">
        <input
          value={tax}
          onChange={(event) => onChargeChange('tax', event.target.value)}
          inputMode="decimal"
          className="min-w-[calc(50%-0.25rem)] flex-1 rounded bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
          placeholder="Tax"
        />
        <input
          value={tip}
          onChange={(event) => onChargeChange('tip', event.target.value)}
          inputMode="decimal"
          className="min-w-[calc(50%-0.25rem)] flex-1 rounded bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
          placeholder="Tip"
        />
        <input
          value={fees}
          onChange={(event) => onChargeChange('fees', event.target.value)}
          inputMode="decimal"
          className="min-w-[calc(50%-0.25rem)] flex-1 rounded bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
          placeholder="Fees"
        />
        <input
          value={discount}
          onChange={(event) => onChargeChange('discount', event.target.value)}
          inputMode="decimal"
          className="min-w-[calc(50%-0.25rem)] flex-1 rounded bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
          placeholder="Discount"
        />
      </div>
    </section>
  )
}