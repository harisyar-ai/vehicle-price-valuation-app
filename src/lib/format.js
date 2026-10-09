/** PKR formatting matching the original Streamlit app's lakh/crore convention. */

/** "33.2 lacs" or "1.25 crore" */
export function formatLacs(lacs) {
  if (!isFinite(lacs)) return '—'
  if (lacs >= 100) return `${(lacs / 100).toFixed(2)} crore`
  return `${lacs.toFixed(1)} lacs`
}

/** "PKR 33.2 Lacs" */
export function formatPrice(lacs) {
  return `PKR ${formatLacs(lacs).replace(/^./, (c) => c.toUpperCase())}`
}

/** Absolute rupees, e.g. "Rs 3,323,120" */
export function formatRupees(lacs) {
  if (!isFinite(lacs)) return '—'
  return 'Rs ' + Math.round(lacs * 100000).toLocaleString('en-PK')
}

/** Compact axis helper for the range bar */
export function formatShort(lacs) {
  if (lacs >= 100) return `${(lacs / 100).toFixed(1)}cr`
  return `${Math.round(lacs)}L`
}
