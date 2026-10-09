import React from 'react'
import { Field, Select } from './fields.jsx'

/** Step 01 — cascading Make → Model → Generation selects. */
export default function VehicleStep({ data, brand, model, generation, onPick }) {
  const brands = React.useMemo(() => Object.keys(data || {}).sort(), [data])
  const models = React.useMemo(
    () => (brand && data?.[brand] ? Object.keys(data[brand]).sort() : []),
    [data, brand]
  )
  const generations = React.useMemo(() => {
    if (!brand || !model) return []
    const gens = data?.[brand]?.[model]?.generations || []
    return [...gens].sort()
  }, [data, brand, model])

  return (
    <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="tnum font-display text-[13px] font-bold text-accent">01</span>
        <h2 className="font-display text-[17px] font-semibold tracking-tight">Vehicle</h2>
        <span className="ml-auto hidden text-[12px] text-muted sm:block">
          {brands.length} makes indexed
        </span>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Make">
          <Select
            value={brand}
            onChange={(v) => onPick('brand', v)}
            options={brands}
            placeholder="Choose make"
          />
        </Field>
        <Field label="Model">
          <Select
            value={model}
            onChange={(v) => onPick('model', v)}
            options={models}
            disabled={!brand}
            placeholder={brand ? 'Choose model' : 'Pick a make first'}
          />
        </Field>
        <Field label="Generation" hint={generations.length ? `${generations.length} found` : ''}>
          <Select
            value={generation}
            onChange={(v) => onPick('generation', v)}
            options={generations}
            disabled={!model}
            placeholder={model ? (generations.length ? 'Choose generation' : 'Unspecified') : 'Pick a model first'}
          />
        </Field>
      </div>

      {brand && model && (
        <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-muted">
          Valuing a <strong className="font-semibold text-ink">{brand} {model}</strong>
          {generation ? <> · <strong className="font-semibold text-ink">{generation}</strong></> : null}
          {' '}against live market comparables.
        </p>
      )}
    </section>
  )
}
