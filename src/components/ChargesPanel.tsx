import SectionCard from './SectionCard'

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
      <div className="input-affix">
        <span className="input-affix__prefix">$</span>
        <input
          value={value}
          onChange={(event) => onChargeChange(field, event.target.value)}
          inputMode="decimal"
          pattern="^\d*(?:\.\d{0,2})?$"
          placeholder={placeholder}
          aria-label={placeholder}
        />
      </div>
    )
  }

  return (
    <SectionCard title="Charges" subtitle="Tax, tip, fees, and discounts split by share.">
      <div className="field-row">
        {renderCurrencyInput('tax', tax, 'Tax')}
        {renderCurrencyInput('tip', tip, 'Tip')}
        {renderCurrencyInput('fees', fees, 'Fees')}
        {renderCurrencyInput('discount', discount, 'Discount')}
      </div>
    </SectionCard>
  )
}
