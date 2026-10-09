import React from 'react'

function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 className="mb-4 font-display text-[16px] font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function Stat({ label, value, last }) {
  return (
    <div className={'flex items-baseline justify-between gap-4 py-2.5 ' + (last ? '' : 'border-b border-line/70')}>
      <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <span className="tnum text-right text-[14px] font-semibold text-ink">{value}</span>
    </div>
  )
}

/** Docs page — the 2026 research study behind the model. */
export default function DocsPage() {
  return (
    <>
      <div className="mb-6 max-w-2xl">
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">
          About this study
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          The research, the data, and the model behind every valuation on this site.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card title="The research">
          <p className="text-[14px] font-semibold text-ink">
            Pakistani Used Car Price Prediction — 2026
          </p>
          <p className="mt-3 text-[13.5px] leading-[1.85] text-ink/80">
            This is the first Pakistani used-car pricing study built on{' '}
            <strong className="font-semibold text-ink">2025–2026 PakWheels data</strong>.
            Prior studies (Asghar et al. 2021, Ahtesham &amp; Zulfiqar 2022) relied on a
            2020 Kaggle extract where prices are <strong className="font-semibold text-accent">65–197% below</strong>{' '}
            current market values — making those models structurally obsolete for today's
            buyers and sellers.
          </p>
          <p className="mt-3 text-[13.5px] leading-[1.85] text-ink/80">
            This study introduces <strong className="font-semibold text-ink">generation &amp; trim-grade hierarchy</strong>{' '}
            as features for the first time in the Pakistani context — capturing the significant
            price variance between, e.g., a Corolla XLi and a Corolla Altis Grande, or a
            Civic Reborn and an 11th-generation Civic.
          </p>
        </Card>

        <Card title="Author">
          <Stat label="Author" value="Muhammad Haris Afridi" />
          <Stat label="Institution" value="ICS/IT, UAP Peshawar" />
          <Stat label="Paper" value="ESA — link pending" last />
        </Card>

        <Card title="Model performance">
          <Stat label="Best model" value="LightGBM" />
          <Stat label="Test R²" value="0.9676" />
          <Stat label="RMSE" value="5.84 lacs PKR" />
          <Stat label="MAE" value="2.87 lacs PKR" />
          <Stat label="5-fold CV R²" value="0.9666 ± 0.0012" last />
        </Card>

        <Card title="Dataset & methodology">
          <Stat label="Source" value="PakWheels.com — 2025–2026 scrape" />
          <Stat label="Listings" value="58,750 modelling records" />
          <Stat label="Brands covered" value="76+ brands, 600+ models" />
          <Stat label="Key novelty" value="Generation + trim-grade hierarchy" />
          <Stat label="Prior-studies gap" value="2020 data — 65–197% price gap" />
          <Stat label="Validation" value="5-fold stratified CV" last />
        </Card>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-white p-5 text-center">
        <p className="mx-auto max-w-2xl text-[12.5px] leading-[1.8] text-muted">
          Prices shown are predicted <em>listing</em> prices based on PakWheels data — not
          transaction prices. Actual sale prices may differ. Use as a reference point only.
          Not financial advice.
        </p>
      </div>
    </>
  )
}
