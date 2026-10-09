import React from 'react'

/** Shared PakWheels listing cards — used by Search page and Predict's similar-listings. */
export default function ListingCards({ listings }) {
  if (!listings || listings.length === 0) return null
  return (
    <>
      <p className="mb-4 text-[12.5px] text-muted">
        <span className="tnum font-semibold text-ink">{listings.length}</span> live{' '}
        {listings.length === 1 ? 'listing' : 'listings'} on PakWheels
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {listings.map((l, i) => (
          <a
            key={l.Listing_URL || i}
            href={l.Listing_URL || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex gap-4 rounded-xl border border-line bg-white p-4 transition-colors hover:border-muted"
          >
            {l.Cover_URL ? (
              <img
                src={l.Cover_URL}
                alt=""
                loading="lazy"
                className="h-24 w-32 shrink-0 rounded-lg border border-line object-cover"
              />
            ) : (
              <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg border border-line bg-paperdark font-display text-[12px] font-bold text-muted">
                {l.brand?.[0] || 'M'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-[14.5px] font-semibold tracking-tight group-hover:text-accent">
                {l.Title}
              </p>
              <p className="tnum mt-1 font-display text-[16px] font-bold text-ink">{l.Price}</p>
              <p className="mt-1 text-[12px] text-muted">
                {[l.Year, l.City].filter(Boolean).join(' · ')}
              </p>
            </div>
          </a>
        ))}
      </div>
    </>
  )
}
