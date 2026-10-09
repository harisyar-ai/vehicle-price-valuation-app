const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env.VITE_API_URL) ||
  '/api/predict'

const SEARCH_URL =
  (typeof import.meta !== 'undefined' && import.meta.env.VITE_SEARCH_URL) ||
  '/api/search'

export async function searchListings(params) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString()
  let res
  try {
    res = await fetch(`${SEARCH_URL}?${qs}`)
  } catch (e) {
    throw new Error('Could not reach the listings service. Check your connection and try again.')
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    throw new Error(`Listings service returned an unreadable response (HTTP ${res.status}).`)
  }
  if (!res.ok) {
    throw new Error(data && data.error ? data.error : `Listing search failed (HTTP ${res.status}).`)
  }
  return data
}

export async function predictPrice(payload) {
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    throw new Error('Could not reach the valuation engine. Check your connection and try again.')
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    throw new Error(`Valuation engine returned an unreadable response (HTTP ${res.status}).`)
  }
  if (!res.ok) {
    throw new Error(data && data.error ? data.error : `Valuation failed (HTTP ${res.status}).`)
  }
  return data
}
