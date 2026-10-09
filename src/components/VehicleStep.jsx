import React from 'react'
import { Field } from './fields.jsx'
import { Combobox } from './Combobox.jsx'
import { orderedBrands } from '../lib/brands.js'

/** Step 01 — cascading Make → Model → Generation selects (searchable, volume-ordered). */
export default function VehicleStep({ data, brand, model, generation, onPick }) {
  const brands = React.useMemo(() => orderedBrands(data), [data])
  const models = React.useMemo(
    () => (brand && data?.[brand] ? Object.keys(data[brand]).sort() : []),
    [data, brand]
  )
  const generations = React.useMemo(() => {
    if (!brand || !model) return []
    // NOTE: dropdown entries are objects like {generation: '11th (E170) Generation', ...},
    // not strings — same extraction the Streamlit app does (g['generation']).
    const raw = data?.[brand]?.[model]?.generations || []
    const names = raw
      .map((g) => (typeof g === 'string' ? g : g?.generation))
      .filter(Boolean)
    return [...new Set(names)].sort()
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
          <Combobox
            value={brand}
            onChange={(v) => onPick('brand', v)}
            options={brands}
            placeholder="Type or choose make"
          />
        </Field>
        <Field label="Model">
          <Combobox
            value={model}
            onChange={(v) => onPick('model', v)}
            options={models}
            disabled={!brand}
            placeholder={brand ? 'Type or choose model' : 'Pick a make first'}
          />
        </Field>
        <Field label="Generation" hint={generations.length ? `${generations.length} found` : ''}>
          <Combobox
            value={generation}
            onChange={(v) => onPick('generation', v)}
            options={generations}
            disabled={!model}
            placeholder={model ? (generations.length ? 'Type or choose generation' : 'Unspecified') : 'Pick a model first'}
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
