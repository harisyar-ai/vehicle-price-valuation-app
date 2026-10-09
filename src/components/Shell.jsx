import React from 'react'

const NAV = [
  {
    id: 'predict',
    label: 'Predict',
    hint: 'Value any used car',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M3 13.5 7.5 9l3 3 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 7.5h-3.5V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    hint: 'Live PakWheels listings',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="m13.2 13.2 3.3 3.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'docs',
    label: 'Docs',
    hint: 'The 2026 study',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M5 2.5h6.5L15.5 6.5V17.5h-10.5V2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M11 2.5v4.5h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7.5 10.5h5M7.5 13.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'about',
    label: 'About',
    hint: 'The author',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
        <circle cx="10" cy="6.8" r="3.3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 17.2c.8-3.2 3.4-4.9 6.5-4.9s5.7 1.7 6.5 4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

function NavList({ page, onNav, onNavigate }) {
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = page === item.id
        return (
          <button
            key={item.id}
            onClick={() => { onNav(item.id); onNavigate && onNavigate() }}
            className={
              'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ' +
              (active ? 'bg-ink text-paper' : 'text-ink/80 hover:bg-paperdark')
            }
          >
            <span className={active ? 'text-accent' : 'text-muted group-hover:text-ink'}>
              {item.icon}
            </span>
            <span>
              <span className="block font-display text-[14px] font-semibold leading-none tracking-tight">
                {item.label}
              </span>
              <span className={'mt-1 block text-[11px] leading-none ' + (active ? 'text-paper/60' : 'text-muted')}>
                {item.hint}
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink font-display text-[15px] font-bold text-paper">
        M
      </span>
      <div>
        <p className="font-display text-[17px] font-bold leading-none tracking-tight">MOTORVAL</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted">
          Pakistan used-car valuation
        </p>
      </div>
    </div>
  )
}

/** App shell: persistent sidebar on desktop, slide-over drawer on mobile. */
export default function Shell({ page, onNav, children }) {
  const [drawer, setDrawer] = React.useState(false)

  return (
    <div className="min-h-screen">
      {/* ── Desktop sidebar ──────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-paper px-4 py-6 lg:flex">
        <Brand />
        <div className="mt-8">
          <NavList page={page} onNav={onNav} />
        </div>
        <div className="mt-auto rounded-lg border border-line bg-white p-3.5">
          <p className="tnum font-display text-[12px] font-bold">LightGBM · 2026 study</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
            Trained on 58,750 PakWheels listings. Test R² 0.9676.
          </p>
        </div>
      </aside>

      {/* ── Mobile drawer ────────────────────────── */}
      {drawer && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setDrawer(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-paper px-4 py-6 transition-transform duration-200 lg:hidden ' +
          (drawer ? 'translate-x-0' : '-translate-x-full')
        }
        aria-hidden={!drawer}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button
            onClick={() => setDrawer(false)}
            className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px] font-semibold text-muted"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <div className="mt-8">
          <NavList page={page} onNav={onNav} onNavigate={() => setDrawer(false)} />
        </div>
      </aside>

      {/* ── Content column ───────────────────────── */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setDrawer(true)}
            className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[15px] text-ink"
            aria-label="Open menu"
          >
            ☰
          </button>
          <p className="font-display text-[15px] font-bold tracking-tight">MOTORVAL</p>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

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
    </div>
  )
}
