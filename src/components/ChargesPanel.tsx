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
  function renderCurrencyInput(
    field: 'tax' | 'tip' | 'fees' | 'discount',
    value: string,
    placeholder: string,
  ) {
    return (
      <label className="relative min-w-[calc(50%-0.25rem)] flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
          $
        </span>
        <input
          value={value}
          onChange={(event) => onChargeChange(field, event.target.value)}
          inputMode="decimal"
          pattern="^\d*(?:\.\d{0,2})?$"
          className="w-full rounded bg-gray-700 py-2 pr-3 pl-7 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
          placeholder={placeholder}
        />
      </label>
    )
  }

  return (
    <section className="space-y-3 rounded bg-gray-800 p-4">
      <h2 className="text-sm text-gray-300">Charges</h2>
      <div className="flex flex-wrap gap-2">
        {renderCurrencyInput('tax', tax, 'Tax')}
        {renderCurrencyInput('tip', tip, 'Tip')}
        {renderCurrencyInput('fees', fees, 'Fees')}
        {renderCurrencyInput('discount', discount, 'Discount')}
      </div>
    </section>
  )
}