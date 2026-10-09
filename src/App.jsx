import React from 'react'
import VehicleStep from './components/VehicleStep.jsx'
import SpecStep, { scopedOptions } from './components/SpecStep.jsx'
import Readout from './components/Readout.jsx'
import { predictPrice } from './lib/api.js'

const EMPTY_SPEC = {
  trim: '',
  engine_cc: '',
  fuel_type: '',
  transmission: '',
  year: '',
  mileage: '',
  city: '',
}

export default function App() {
  const [data, setData] = React.useState(null)
  const [dataError, setDataError] = React.useState(null)
  const [brand, setBrand] = React.useState('')
  const [model, setModel] = React.useState('')
  const [generation, setGeneration] = React.useState('')
  const [spec, setSpec] = React.useState(EMPTY_SPEC)
  const [errors, setErrors] = React.useState({})
  const [phase, setPhase] = React.useState('idle') // idle | loading | done | error
  const [result, setResult] = React.useState(null)
  const [failMsg, setFailMsg] = React.useState('')

  React.useEffect(() => {
    fetch('/dropdown_data.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch(() => setDataError('Could not load the vehicle catalogue. Reload the page to try again.'))
  }, [])

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
  }

  // When generation changes, keep other spec but clear trim/engine/fuel/etc? No —
  // keep it simple: only full vehicle changes reset spec (above). Generation
  // change re-scopes options; stale values are validated at submit.
  const pickSpec = (key, value) => {
    setSpec((s) => ({ ...s, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
    if (phase === 'done' || phase === 'error') { setPhase('idle'); setResult(null) }
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

  return (
    <div className="min-h-screen">
      {/* ── Masthead ─────────────────────────────── */}
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink font-display text-[15px] font-bold text-paper">
              M
            </span>
            <div>
              <p className="font-display text-[17px] font-bold leading-none tracking-tight">
                MOTORVAL
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-muted">
                Pakistan used-car valuation
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-[12px] text-muted sm:flex">
            <span className="rounded-full border border-line bg-white px-3 py-1 tnum">
              LightGBM · 2026 study
            </span>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {dataError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-800">
            {dataError}
          </div>
        ) : !data ? (
          <div className="space-y-4">
            <div className="skeleton h-40" />
            <div className="skeleton h-64" />
          </div>
        ) : (
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
                  {phase === 'loading' ? 'Running valuation…' : 'Run valuation'}
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
          </>
        )}
      </main>

      {/* ── Footer ───────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            MotorVal · model by Muhammad Haris Afridi ·{' '}
            <span className="tnum">77 makes indexed</span>
          </p>
          <p>Prices track the used market — re-check before you buy or sell.</p>
        </div>
      </footer>
    </div>
  )
}
