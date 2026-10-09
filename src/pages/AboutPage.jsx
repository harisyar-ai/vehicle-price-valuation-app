import React from 'react'

const SOCIALS = [
  { label: 'Portfolio', href: 'https://harisyar-ai.github.io/harisyar-ai/' },
  { label: 'GitHub', href: 'https://github.com/harisyar-ai' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/harisyar-ai/' },
  { label: 'Email', href: 'mailto:mharisyar.ai@gmail.com' },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/923339342567?text=Hi%20Haris!%20I%20came%20across%20your%20car%20price%20predictor%20and%20would%20love%20to%20connect.',
  },
]

const BADGES = ['AI Engineer', 'Full-Stack Dev', 'BSc AI Student', 'DIP Lab RA', 'Avid Reader']

function InfoCard({ title, rows }) {
  return (
    <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 className="mb-4 font-display text-[16px] font-semibold tracking-tight">{title}</h2>
      <div>
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={'py-2.5 ' + (i < rows.length - 1 ? 'border-b border-line/70' : '')}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="mt-1 text-[14px] font-medium text-ink">{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/** About page — the author behind the study. */
export default function AboutPage() {
  return (
    <>
      <div className="mb-6 max-w-2xl">
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">
          About the author
        </h1>
      </div>

      {/* Hero */}
      <section className="rounded-xl border border-line bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <img
            src="https://github.com/harisyar-ai.png"
            alt="Muhammad Haris Afridi"
            className="h-24 w-24 shrink-0 rounded-xl border border-line object-cover"
            loading="lazy"
          />
          <div>
            <p className="font-display text-[22px] font-bold tracking-tight">Muhammad Haris Afridi</p>
            <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">
              AI Engineer &amp; Full-Stack Developer
            </p>
            <p className="mt-3 max-w-2xl text-[13.5px] leading-[1.85] text-ink/80">
              Self-taught AI Engineer and Full-Stack Developer from Peshawar, Pakistan.
              I love turning raw ideas into real-world tools — whether it's a machine
              learning model, a government web platform, or an intelligent recommender
              system. Currently pursuing a BS in Artificial Intelligence at the
              University of Agriculture Peshawar, and serving as a Research Assistant
              at the Digital Image Processing (DIP) Lab, Islamia College Peshawar.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {BADGES.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-line bg-paper px-3 py-1 text-[12px] font-medium text-ink/80"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Socials */}
      <div className="mt-6 flex flex-wrap gap-2.5">
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target={s.href.startsWith('mailto') ? undefined : '_blank'}
            rel="noopener noreferrer"
            className="rounded-lg border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {s.label}
            <span className="ml-1.5 text-muted">↗</span>
          </a>
        ))}
      </div>

      {/* Info grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <InfoCard
          title="Education & role"
          rows={[
            ['University', 'Agriculture University of Peshawar'],
            ['Degree', 'BS Artificial Intelligence (2023–2027)'],
            ['Research role', 'Research Assistant, DIP Lab — Islamia College Peshawar'],
            ['Location', 'Peshawar, Khyber Pakhtunkhwa, Pakistan'],
          ]}
        />
        <InfoCard
          title="This project"
          rows={[
            ['Research type', 'Used Car Price Prediction — Pakistan 2026'],
            ['Model used', 'LightGBM — R² 0.9676'],
            ['Dataset', '58,750 PakWheels listings (2025–2026 scrape)'],
            ['Publication', 'ESA Submission — link pending'],
          ]}
        />
      </div>

      <div className="mt-6 rounded-xl border border-line bg-white p-5">
        <p className="text-[13px] leading-[1.85] text-muted">
          Want to see more of my work? Visit my portfolio at{' '}
          <a
            href="https://harisyar-ai.github.io/harisyar-ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent hover:underline"
          >
            harisyar-ai.github.io/harisyar-ai
          </a>{' '}
          — featuring all my projects, skills, certifications, and contact details.
        </p>
      </div>

      <div className="mt-8 border-t border-line pt-5 text-center">
        <p className="font-display text-[14px] font-bold tracking-tight">Pakistani Cars Price AI</p>
        <p className="mt-1 text-[12px] text-muted">
          2026 Research Study · Institute of Computer Sciences and Information Technology,
          The University of Agriculture, Peshawar, Pakistan
        </p>
        <p className="tnum mt-2 text-[11.5px] text-muted">
          © 2026 Muhammad Haris Afridi · Trained on 58,750 PakWheels listings · LightGBM · scikit-learn
        </p>
      </div>
    </>
  )
}
