import React from 'react'

const cardCls =
  'overflow-hidden rounded-xl border border-line bg-white transition-colors hover:border-muted'

function ListingCard({ l }) {
  // If the cover image fails to load (blocked network, dead URL…), fall back
  // to the brand-initial tile instead of showing a broken-image icon.
  const [imgOk, setImgOk] = React.useState(true)
  React.useEffect(() => setImgOk(true), [l.Cover_URL])

  const cover = l.Cover_URL && imgOk ? (
    <a href={l.Listing_URL || '#'} target="_blank" rel="noopener noreferrer" aria-label={l.Title}>
      <img
        src={l.Cover_URL}
        alt=""
        loading="lazy"
        onError={() => setImgOk(false)}
        className="h-44 w-full border-b border-line object-cover"
      />
    </a>
  ) : (
    <div className="flex h-44 w-full items-center justify-center border-b border-line bg-paperdark font-display text-[15px] font-bold text-muted">
      {l.brand?.[0] || 'M'}
    </div>
  )

  return (
    <div data-card className={cardCls}>
      {cover}
      <div className="p-4">
        <p className="truncate font-display text-[15px] font-semibold tracking-tight">
          {l.Title}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2.5">
          <p className="tnum font-display text-[19px] font-bold text-ink">{l.Price}</p>
          <a
            href={l.Listing_URL || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-ink px-2.5 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-paper transition-colors hover:bg-accentdeep"
          >
            View <span aria-hidden="true">➡️</span>
          </a>
        </div>
        <p className="mt-2 text-[12.5px] text-muted">
          {[l.Year, l.City].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  )
}

const navBtn =
  'flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30'

const pageBtn =
  'rounded-lg border border-line bg-white px-5 py-2.5 font-display text-[13px] font-bold uppercase tracking-[0.08em] text-ink shadow-sm transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30'

/**
 * Shared PakWheels listing cards.
 *
 * Two modes:
 *  - Carousel (default, Search page): horizontal snap-scroll, scroll arrows
 *    below the cards when there are 5+ listings.
 *  - Paginated (Predict similar listings, pageSize=5): responsive grid,
 *    "Showing X–Y of Z", Previous/Next page buttons below.
 */
export default function ListingCards({ listings, pageSize = 0 }) {
  const trackRef = React.useRef(null)
  const [page, setPage] = React.useState(0)

  // Reset to first page whenever the result set changes
  React.useEffect(() => {
    setPage(0)
  }, [listings])

  if (!listings || listings.length === 0) return null

  const countLine = (
    <p className="mb-4 text-[12.5px] text-muted">
      <span className="tnum font-semibold text-ink">{listings.length}</span> live{' '}
      {listings.length === 1 ? 'listing' : 'listings'} on PakWheels
    </p>
  )

  /* ---------------- Paginated grid mode ---------------- */
  if (pageSize > 0) {
    const totalPages = Math.max(1, Math.ceil(listings.length / pageSize))
    const safePage = Math.min(page, totalPages - 1)
    const start = safePage * pageSize
    const visible = listings.slice(start, start + pageSize)

    return (
      <div>
        <p className="mb-4 text-[12.5px] text-muted">
          Showing {start + 1}–{start + visible.length} of{' '}
          <span className="tnum font-semibold text-ink">{listings.length}</span> loaded listings
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((l, i) => (
            <ListingCard key={l.Listing_URL || `${start}-${i}`} l={l} />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className={pageBtn}
            >
              ← Previous
            </button>
            <span className="tnum text-[12.5px] text-muted">
              Page {safePage + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              className={pageBtn}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    )
  }

  /* ---------------- Carousel mode ---------------- */
  const showNav = listings.length >= 5

  const scrollByCards = (dir) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector('[data-card]')
    const step = card ? card.offsetWidth + 20 : 320
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div>
      {countLine}
      <div
        ref={trackRef}
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-3"
      >
        {listings.map((l, i) => (
          <div key={l.Listing_URL || i} className="w-[270px] shrink-0 snap-start sm:w-[310px]">
            <ListingCard l={l} />
          </div>
        ))}
      </div>

      {showNav && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label="Previous listings"
            className={navBtn}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label="Next listings"
            className={navBtn}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
