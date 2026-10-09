/**
 * Brands ordered by listing volume (market presence), not alphabetically.
 * Aggregates `total_listings` per brand from the catalogue JSON — a direct
 * proxy for how common each brand is in the Pakistani used-car market.
 * (Top 3: Suzuki + Toyota + Honda ≈ 76% of all listings.)
 */
export function orderedBrands(data) {
  if (!data) return []
  const vols = Object.entries(data).map(([brand, models]) => {
    let total = 0
    for (const info of Object.values(models || {})) {
      if (info && typeof info === 'object') total += info.total_listings || 0
    }
    return [brand, total]
  })
  vols.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return vols.map(([b]) => b)
}
