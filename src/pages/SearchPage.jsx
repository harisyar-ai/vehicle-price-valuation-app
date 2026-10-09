import React from 'react'
import { Field } from '../components/fields.jsx'
import { Combobox } from '../components/Combobox.jsx'
import ListingCards from '../components/ListingCards.jsx'
import { orderedBrands } from '../lib/brands.js'
import { scopedOptions, CITIES } from '../components/SpecStep.jsx'
import { searchListings } from '../lib/api.js'

const clean = (arr) =>
  (arr || []).filter((x) => x !== null && x !== undefined && String(x).trim() !== '' && String(x).toLowerCase() !== 'nan')

/** Search page — live PakWheels listings, mirroring the Streamlit "Search Cars" page. */
export default function SearchPage({ data, dataError }) {
  const [brand, setBrand] = React.useState('')
  const [model, setModel] = React.useState('')
  const [generation, setGeneration] = React.useState('')
  const [trim, setTrim] = React.useState('')
  const [city, setCity] = React.useState('Lahore')
  const [year, setYear] = React.useState('')
  const [phase, setPhase] = React.useState('idle') // idle | loading | done | error
  const [listings, setListings] = React.useState([])
  const [failMsg, setFailMsg] = React.useState('')

  const brands = React.useMemo(() => orderedBrands(data), [data])
  const models = React.useMemo(
    () => (brand && data?.[brand] ? Object.keys(data[brand]).sort() : []),
    [data, brand]
  )
  const generations = React.useMemo(() => {
    if (!brand || !model) return []
    const raw = data?.[brand]?.[model]?.generations || []
    const names = raw.map((g) => (typeof g === 'string' ? g : g?.generation)).filter(Boolean)
    return ['Any generation', ...[...new Set(names)].sort()]
  }, [data, brand, model])

  const scoped = scopedOptions(data, brand, model, generation && generation !== 'Any generation' ? generation : '')
  const trims = React.useMemo(() => {
    const t = clean(scoped?.trims)
    return ['Any variant', ...(t.length ? [...new Set(t)].sort() : [])]
  }, [scoped])
  const years = React.useMemo(() => {
    const y = clean(scoped?.years).map(Number).filter((n) => Number.isFinite(n) && n >= 1990 && n <= 2026)
    const list = y.length ? [...new Set(y)].sort((a, b) => b - a) : Array.from({ length: 27 }, (_, i) => 2026 - i)
    return ['Any year', ...list.map(String)]
  }, [scoped])

  const pick = (setter, reset = []) => (v) => {
    setter(v)
    reset.forEach((r) => r(''))
    setPhase('idle'); setListings([]); setFailMsg('')
  }
  const pickBrand = pick(setBrand, [setModel, setGeneration, setTrim, setYear])
  const pickModel = pick(setModel, [setGeneration, setTrim, setYear])

  const runSearch = async () => {
    if (!brand || !model) return
    setPhase('loading'); setFailMsg(''); setListings([])
    try {
      const res = await searchListings({
        brand,
        model,
        generation: generation && generation !== 'Any generation' ? generation : '',
        trim: trim && trim !== 'Any variant' ? trim : '',
        city,
        year: year && year !== 'Any year' ? year : '',
      })
      setListings(res.listings || [])
      setPhase('done')
    } catch (err) {
      setFailMsg(err.message || 'Search failed.')
      setPhase('error')
    }
  }

  if (dataError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-800">
        {dataError}
      </div>
    )
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-40" />
        <div className="skeleton h-64" />
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 max-w-2xl">
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">
          Search live listings
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Real cars for sale on PakWheels right now, matched to your brand, model,
          generation, variant, year, and city.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Brand">
            <Combobox value={brand} onChange={pickBrand} options={brands} placeholder="Type or choose brand" />
          </Field>
          <Field label="Model">
            <Combobox value={model} onChange={pickModel} options={models} disabled={!brand} placeholder={brand ? 'Type or choose model' : 'Pick a brand first'} />
          </Field>
          <Field label="Generation">
            <Combobox value={generation} onChange={(v) => { setGeneration(v); setTrim(''); setYear('') }} options={generations} disabled={!model} placeholder={model ? 'Type or choose generation' : 'Pick a model first'} />
          </Field>
          <Field label="Variant">
            <Combobox value={trim} onChange={setTrim} options={trims} disabled={!model} placeholder="Type or choose variant" />
          </Field>
          <Field label="Year">
            <Combobox value={year} onChange={setYear} options={years} disabled={!model} placeholder="Type or choose year" />
          </Field>
          <Field label="City">
            <Combobox value={city} onChange={setCity} options={CITIES} placeholder="Type or choose city" />
          </Field>
        </div>
        <button
          onClick={runSearch}
          disabled={phase === 'loading' || !brand || !model}
          className="mt-5 w-full rounded-xl bg-accent px-6 py-4 font-display text-[16px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_2px_0_#92400E] transition-all hover:bg-accentdeep active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {phase === 'loading' ? 'Searching PakWheels…' : 'Search cars'}
        </button>
      </section>

      <div className="mt-6">
        {phase === 'loading' && (
          <div className="space-y-4">
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
          </div>
        )}

        {phase === 'error' && (
          <div className="rounded-xl border border-line bg-white p-8 text-center">
            <p className="font-display text-[17px] font-semibold tracking-tight">Live listings unavailable</p>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">{failMsg}</p>
            <button
              onClick={runSearch}
              className="mt-4 rounded-lg border border-line bg-paper px-5 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-muted"
            >
              Try again
            </button>
          </div>
        )}

        {phase === 'done' && listings.length === 0 && (
          <div className="rounded-xl border border-line bg-white p-8 text-center">
            <p className="font-display text-[17px] font-semibold tracking-tight">No listings right now</p>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
              No live listings matched this exact search. Try a different year, city, or variant.
            </p>
          </div>
        )}

        {phase === 'done' && listings.length > 0 && (
          <ListingCards listings={listings} />
        )}
      </div>
    </>
  )
}
