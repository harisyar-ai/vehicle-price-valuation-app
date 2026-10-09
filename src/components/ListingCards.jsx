import React from 'react'

/**
 * Shared PakWheels listing cards — horizontal snap carousel.
 * Used by Search page and Predict's similar-listings section.
 * Prev/Next arrows appear only when there are 5+ listings.
 */
export default function ListingCards({ listings }) {
  const trackRef = React.useRef(null)
  if (!listings || listings.length === 0) return null
  const showNav = listings.length >= 5

  const scrollByCards = (dir) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector('[data-card]')
    const step = card ? card.offsetWidth + 20 : 320
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const navBtn =
    'flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-muted">
          <span className="tnum font-semibold text-ink">{listings.length}</span> live{' '}
          {listings.length === 1 ? 'listing' : 'listings'} on PakWheels
        </p>
        {showNav && (
          <div className="flex shrink-0 gap-2">
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

      <div
        ref={trackRef}
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-3"
      >
        {listings.map((l, i) => (
          <a
            key={l.Listing_URL || i}
            data-card
            href={l.Listing_URL || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group w-[270px] shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-white transition-colors hover:border-muted sm:w-[310px]"
          >
            {l.Cover_URL ? (
              <img
                src={l.Cover_URL}
                alt=""
                loading="lazy"
                className="h-44 w-full border-b border-line object-cover"
              />
            ) : (
              <div className="flex h-44 w-full items-center justify-center border-b border-line bg-paperdark font-display text-[15px] font-bold text-muted">
                {l.brand?.[0] || 'M'}
              </div>
            )}
            <div className="p-4">
              <p className="truncate font-display text-[15px] font-semibold tracking-tight group-hover:text-accent">
                {l.Title}
              </p>
              <p className="tnum mt-1.5 font-display text-[19px] font-bold text-ink">{l.Price}</p>
              <p className="mt-1 text-[12.5px] text-muted">
                {[l.Year, l.City].filter(Boolean).join(' · ')}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
