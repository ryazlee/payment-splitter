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
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-fg-muted">
          $
        </span>
        <input
          value={value}
          onChange={(event) => onChargeChange(field, event.target.value)}
          inputMode="decimal"
          pattern="^\d*(?:\.\d{0,2})?$"
          className="w-full rounded bg-inset py-2 pr-3 pl-7 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder={placeholder}
        />
      </label>
    )
  }

  return (
    <section className="space-y-3 rounded-app border border-border bg-surface p-4">
      <h2 className="section-label">Charges</h2>
      <div className="flex flex-wrap gap-2">
        {renderCurrencyInput('tax', tax, 'Tax')}
        {renderCurrencyInput('tip', tip, 'Tip')}
        {renderCurrencyInput('fees', fees, 'Fees')}
        {renderCurrencyInput('discount', discount, 'Discount')}
      </div>
    </section>
  )
}