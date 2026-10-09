import React from 'react'
import { formatPrice, formatLacs, formatRupees, formatShort } from '../lib/format.js'

const CONF_STYLE = {
  high: 'bg-moss/10 text-moss border-moss/30',
  good: 'bg-accent/10 text-accentdeep border-accent/30',
  mod: 'bg-ink/5 text-muted border-line',
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-label="Loading valuation">
      <div className="skeleton h-3 w-2/5" />
      <div className="skeleton h-16 w-4/5" />
      <div className="skeleton h-3 w-3/5" />
      <div className="skeleton h-2 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-12" />
        <div className="skeleton h-12" />
      </div>
      <p className="tnum text-[12px] text-muted">Running gradient-boosted valuation…</p>
    </div>
  )
}

function SpecRecap({ spec, brand, model, generation }) {
  const rows = [
    ['Vehicle', [brand, model, generation].filter(Boolean).join(' · ')],
    ['Trim', spec.trim],
    ['Engine', spec.engine_cc ? `${spec.engine_cc} cc` : '—'],
    ['Fuel', spec.fuel_type],
    ['Gearbox', spec.transmission],
    ['Year', spec.year],
    ['Mileage', spec.mileage !== '' ? `${Number(spec.mileage).toLocaleString('en-PK')} km` : '—'],
    ['City', spec.city],
  ]
  return (
    <dl className="divide-y divide-line/70 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="text-muted">{k}</dt>
          <dd className="tnum text-right font-medium text-ink">{v || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Right-hand instrument readout: idle → loading → price reveal / error. */
export default function Readout({ phase, result, error, spec, brand, model, generation, onRetry }) {
  return (
    <aside className="lg:sticky lg:top-6">
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line bg-paper px-5 py-3">
          <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em]">
            Valuation readout
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                phase === 'done' ? 'bg-moss' : phase === 'loading' ? 'bg-accent' : 'bg-line'
              }`}
            />
            {phase === 'done' ? 'priced' : phase === 'loading' ? 'working' : phase === 'error' ? 'failed' : 'standby'}
          </span>
        </div>

        <div className="p-5 sm:p-6">
          {phase === 'idle' && (
            <div>
              <p className="font-display text-[15px] font-medium leading-snug">
                Configure the vehicle on the left.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                The engine prices it against thousands of PakWheels listings using a
                LightGBM model — age, mileage, trim rarity, city tier and brand
                lineage all feed the estimate.
              </p>
              <div className="mt-5 border-t border-line pt-4">
                <SpecRecap spec={spec} brand={brand} model={model} generation={generation} />
              </div>
            </div>
          )}

          {phase === 'loading' && <Skeleton />}

          {phase === 'error' && (
            <div className="rise">
              <p className="font-display text-[15px] font-semibold text-red-800">Valuation failed</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{error}</p>
              <button
                onClick={onRetry}
                className="mt-4 w-full rounded-md bg-ink px-4 py-2.5 text-[14px] font-semibold text-paper transition-colors hover:bg-accentdeep"
              >
                Try again
              </button>
            </div>
          )}

          {phase === 'done' && result && (
            <div>
              <p className="rise text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Estimated market price
              </p>
              <p className="rise rise-1 tnum mt-2 font-display text-[44px] font-bold leading-none tracking-tight text-ink sm:text-[52px]">
                {formatPrice(result.price_lacs)}
              </p>
              <p className="rise rise-1 tnum mt-1.5 text-[13px] text-muted">
                {formatRupees(result.price_lacs)} · {result.urdu}
              </p>

              <div className="rise rise-2 mt-5">
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className="tnum font-semibold text-ink">{formatLacs(result.low_lacs)}</span>
                  <span className="text-muted">expected range</span>
                  <span className="tnum font-semibold text-ink">{formatLacs(result.high_lacs)}</span>
                </div>
                <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-paperdark">
                  <div className="range-fill absolute inset-y-0 left-[8%] right-[8%] rounded-full bg-accent" />
                </div>
                <div className="tnum mt-1.5 flex justify-between text-[11px] text-muted">
                  <span>{formatShort(result.low_lacs)}</span>
                  <span>{formatShort(result.high_lacs)}</span>
                </div>
              </div>

              <div className="rise rise-2 mt-4">
                <span
                  className={`inline-block rounded-full border px-3 py-1 text-[12px] font-semibold ${CONF_STYLE[result.confidence] || CONF_STYLE.mod}`}
                >
                  {result.confidence_label}
                </span>
              </div>

              <div className="rise rise-3 mt-5 border-t border-line pt-4">
                <SpecRecap spec={spec} brand={brand} model={model} generation={generation} />
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-muted">
        Model: LightGBM, RMSE 5.84 lacs · MAE 2.87 lacs on holdout. Estimates, not offers —
        condition, accidents and maintenance history move real prices.
      </p>
    </aside>
  )
}
