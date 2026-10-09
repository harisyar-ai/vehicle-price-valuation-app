import React from 'react'
import VehicleStep from '../components/VehicleStep.jsx'
import SpecStep from '../components/SpecStep.jsx'
import Readout from '../components/Readout.jsx'
import ListingCards from '../components/ListingCards.jsx'
import { predictPrice, searchListings } from '../lib/api.js'

const EMPTY_SPEC = {
  trim: '',
  engine_cc: '',
  fuel_type: '',
  transmission: '',
  year: '',
  mileage: '',
  city: '',
}

/** Predict page — the valuation flow: Vehicle → Spec → valuation readout. */
export default function PredictPage({ data, dataError }) {
  const [brand, setBrand] = React.useState('')
  const [model, setModel] = React.useState('')
  const [generation, setGeneration] = React.useState('')
  const [spec, setSpec] = React.useState(EMPTY_SPEC)
  const [errors, setErrors] = React.useState({})
  const [phase, setPhase] = React.useState('idle') // idle | loading | done | error
  const [result, setResult] = React.useState(null)
  const [failMsg, setFailMsg] = React.useState('')
  // Similar PakWheels listings for the valued car (mirrors Streamlit's
  // "SHOW SIMILAR LISTINGS" step after prediction).
  const [simPhase, setSimPhase] = React.useState('idle') // idle | loading | done | error
  const [simListings, setSimListings] = React.useState([])
  const [simError, setSimError] = React.useState('')

  // Tracks whether the user typed their own mileage. Until they do, picking a
  // year auto-fills the Streamlit-style estimate: car_age × 12,000 km.
  const mileageTouched = React.useRef(false)

  const resetSimilar = () => {
    setSimPhase('idle'); setSimListings([]); setSimError('')
  }

  const pickVehicle = (key, value) => {
    if (key === 'brand') {
      setBrand(value); setModel(''); setGeneration('')
    } else if (key === 'model') {
      setModel(value); setGeneration('')
    } else {
      setGeneration(value)
    }
    // Dependent spec fields reset whenever the vehicle changes
    setSpec(EMPTY_SPEC)
    setErrors({})
    setPhase('idle'); setResult(null)
    mileageTouched.current = false
    resetSimilar()
  }

  const pickSpec = (key, value) => {
    if (key === 'mileage') mileageTouched.current = true
    setSpec((s) => {
      const next = { ...s, [key]: value }
      // Auto-estimate mileage from the year until the user types their own
      // (mirrors the Streamlit app: max(1, 2026 - year) * 12000 km).
      if (key === 'year' && value && !mileageTouched.current) {
        const age = Math.max(1, 2026 - Number(value))
        if (Number.isFinite(age)) next.mileage = String(age * 12000)
      }
      return next
    })
    setErrors((e) => ({ ...e, [key]: undefined }))
    if (phase === 'done' || phase === 'error') { setPhase('idle'); setResult(null); resetSimilar() }
  }

  const validate = () => {
    const e = {}
    if (!brand) e.brand = 'Choose a make'
    if (!model) e.model = 'Choose a model'
    if (!spec.trim) e.trim = 'Required'
    if (!spec.engine_cc) e.engine_cc = 'Required'
    if (!spec.fuel_type) e.fuel_type = 'Required'
    if (!spec.transmission) e.transmission = 'Required'
    if (!spec.year) e.year = 'Required'
    if (spec.mileage === '' || spec.mileage === null) e.mileage = 'Required'
    else {
      const m = Number(spec.mileage)
      if (!Number.isFinite(m) || m < 0 || m > 1000000) e.mileage = '0 – 1,000,000 km'
    }
    if (!spec.city) e.city = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const runValuation = async () => {
    if (!validate()) return
    setPhase('loading'); setFailMsg(''); setResult(null)
    resetSimilar()
    try {
      const res = await predictPrice({
        brand,
        model,
        generation: generation || 'Unspecified',
        trim: spec.trim,
        engine_cc: Number(spec.engine_cc),
        fuel_type: spec.fuel_type,
        transmission: spec.transmission,
        year: Number(spec.year),
        mileage: Number(spec.mileage),
        city: spec.city,
      })
      setResult(res)
      setPhase('done')
    } catch (err) {
      setFailMsg(err.message || 'Valuation failed.')
      setPhase('error')
    }
  }

  const showSimilar = async () => {
    setSimPhase('loading'); setSimError(''); setSimListings([])
    try {
      const res = await searchListings({
        brand,
        model,
        generation: generation || 'Unspecified',
        trim: spec.trim,
        city: spec.city,
        year: String(spec.year),
      })
      setSimListings((res.listings || []).slice(0, 6))
      setSimPhase('done')
    } catch (err) {
      setSimError(err.message || 'Could not load similar listings.')
      setSimPhase('error')
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
          What is it actually worth?
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Pick the car, spec it honestly, and get a data-driven market estimate —
          trained on thousands of real PakWheels listings, not guesswork.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <VehicleStep
            data={data}
            brand={brand}
            model={model}
            generation={generation}
            onPick={pickVehicle}
          />
          <SpecStep
            data={data}
            brand={brand}
            model={model}
            generation={generation}
            spec={spec}
            onPick={pickSpec}
            errors={errors}
          />
          <button
            onClick={runValuation}
            disabled={phase === 'loading' || !brand || !model}
            className="w-full rounded-xl bg-accent px-6 py-4 font-display text-[16px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_2px_0_#92400E] transition-all hover:bg-accentdeep active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {phase === 'loading' ? 'Predicting…' : 'Predict Price'}
          </button>
          {(errors.brand || errors.model) && (
            <p className="text-[13px] font-medium text-red-700">
              {errors.brand || errors.model}
            </p>
          )}
        </div>

        <Readout
          phase={phase}
          result={result}
          error={failMsg}
          spec={spec}
          brand={brand}
          model={model}
          generation={generation}
          onRetry={runValuation}
        />
      </div>

      {/* Similar PakWheels listings for the valued car — mirrors the
          Streamlit "SHOW SIMILAR LISTINGS" step after prediction. */}
      {phase === 'done' && result && (
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[19px] font-bold tracking-tight">
              Similar cars for sale
            </h2>
            {simPhase === 'idle' && (
              <button
                onClick={showSimilar}
                className="rounded-xl bg-accent px-8 py-4 font-display text-[15px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_2px_0_#92400E] transition-all hover:bg-accentdeep active:translate-y-[1px] active:shadow-none"
              >
                Show similar listings
              </button>
            )}
          </div>

          {simPhase === 'loading' && (
            <div className="space-y-4">
              <div className="skeleton h-28" />
              <div className="skeleton h-28" />
            </div>
          )}

          {simPhase === 'error' && (
            <div className="rounded-xl border border-line bg-white p-6 text-center">
              <p className="text-[13.5px] text-muted">{simError}</p>
              <button
                onClick={showSimilar}
                className="mt-3 rounded-lg border border-line bg-paper px-5 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-muted"
              >
                Try again
              </button>
            </div>
          )}

          {simPhase === 'done' && simListings.length === 0 && (
            <div className="rounded-xl border border-line bg-white p-6 text-center">
              <p className="text-[13.5px] text-muted">
                No similar listings on PakWheels right now for this exact spec.
              </p>
            </div>
          )}

          {simPhase === 'done' && simListings.length > 0 && (
            <ListingCards listings={simListings} />
          )}
        </section>
      )}
    </>
  )
}
