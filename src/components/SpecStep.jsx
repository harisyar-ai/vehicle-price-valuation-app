import React from 'react'
import { Field, NumberInput } from './fields.jsx'
import { Combobox } from './Combobox.jsx'

export const STANDARD_ENGINES = [660, 800, 1000, 1200, 1300, 1500, 1600, 1800, 2000, 2400, 2500, 2700, 2800, 3000, 4000]
export const DEFAULT_FUELS = ['Petrol', 'Hybrid', 'Diesel', 'Electric', 'REEV', 'CNG']
export const DEFAULT_TRANSMISSIONS = ['Automatic', 'Manual']
export const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Peshawar', 'Multan', 'Gujranwala', 'Sialkot', 'Hyderabad', 'Quetta', 'Other']

const clean = (arr) =>
  (arr || []).filter((x) => x !== null && x !== undefined && String(x).trim() !== '' && String(x).toLowerCase() !== 'nan')

/** Resolve per-model scoped options, mirroring the original app's fallback chain. */
export function scopedOptions(data, brand, model, generation) {
  const m = data?.[brand]?.[model]
  if (!m) return null
  if (generation && generation !== 'Unspecified' && m.by_generation?.[generation]) {
    return m.by_generation[generation]
  }
  return m
}

function uniqSorted(arr, numeric = false) {
  const u = [...new Set(arr.map(String))]
  return numeric ? u.map(Number).filter(Number.isFinite).sort((a, b) => a - b).map(String) : u.sort()
}

/** Step 02 — every control maps to a real model feature. */
export default function SpecStep({ data, brand, model, generation, spec, onPick, errors }) {
  const scoped = scopedOptions(data, brand, model, generation)

  const trims = React.useMemo(() => {
    const t = clean(scoped?.trims)
    return t.length ? t.sort() : ['Unspecified']
  }, [scoped])
  const engines = React.useMemo(() => {
    const e = clean(scoped?.engines)
    return e.length ? uniqSorted(e, true) : STANDARD_ENGINES.map(String)
  }, [scoped])
  const fuels = React.useMemo(() => {
    const f = clean(scoped?.fuels)
    return f.length ? f : DEFAULT_FUELS
  }, [scoped])
  const transmissions = React.useMemo(() => {
    const t = clean(scoped?.transmissions)
    return t.length ? t : DEFAULT_TRANSMISSIONS
  }, [scoped])
  const years = React.useMemo(() => {
    const y = clean(scoped?.years).map(Number).filter((n) => Number.isFinite(n) && n >= 1990 && n <= 2026)
    if (y.length) return [...new Set(y)].sort((a, b) => b - a).map(String)
    const out = []
    for (let yr = 2026; yr >= 2000; yr--) out.push(String(yr))
    return out
  }, [scoped])

  const ready = Boolean(brand && model)

  return (
    <section className={`rounded-xl border border-line bg-white p-5 sm:p-6 transition-opacity ${ready ? '' : 'pointer-events-none opacity-50'}`}>
      <header className="mb-5 flex items-center gap-3">
        <span className="tnum font-display text-[13px] font-bold text-accent">02</span>
        <h2 className="font-display text-[17px] font-semibold tracking-tight">Specification</h2>
        <span className="ml-auto hidden text-[12px] text-muted sm:block">
          {ready ? 'options scoped to this vehicle' : 'select a vehicle first'}
        </span>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Trim / Variant" error={errors.trim}>
          <Combobox value={spec.trim} onChange={(v) => onPick('trim', v)} options={trims} disabled={!ready} placeholder="Type or choose trim" />
        </Field>
        <Field label="Engine" error={errors.engine_cc} hint="cc">
          <Combobox value={spec.engine_cc} onChange={(v) => onPick('engine_cc', v)} options={engines} disabled={!ready} placeholder="Type or choose engine" />
        </Field>
        <Field label="Fuel type" error={errors.fuel_type}>
          <Combobox value={spec.fuel_type} onChange={(v) => onPick('fuel_type', v)} options={fuels} disabled={!ready} placeholder="Type or choose fuel" />
        </Field>
        <Field label="Transmission" error={errors.transmission}>
          <Combobox value={spec.transmission} onChange={(v) => onPick('transmission', v)} options={transmissions} disabled={!ready} placeholder="Type or choose gearbox" />
        </Field>
        <Field label="Model year" error={errors.year}>
          <Combobox value={spec.year} onChange={(v) => onPick('year', v)} options={years} disabled={!ready} placeholder="Type or choose year" />
        </Field>
        <Field label="Mileage" error={errors.mileage} hint="auto-estimated from year">
          <NumberInput value={spec.mileage} onChange={(v) => onPick('mileage', v)} min={0} max={1000000} step={1000} placeholder="e.g. 80000" suffix="km" />
        </Field>
        <Field label="Registration city" error={errors.city} hint="drives city tier">
          <Combobox value={spec.city} onChange={(v) => onPick('city', v)} options={CITIES} disabled={!ready} placeholder="Type or choose city" />
        </Field>
      </div>
    </section>
  )
}
