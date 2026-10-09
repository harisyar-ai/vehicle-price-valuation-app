/**
 * UI smoke test — guards against another white-screen crash.
 *
 * Renders VehicleStep + SpecStep with react-dom/server against the REAL
 * public/dropdown_data.json, simulating brand→model→generation selection,
 * and asserts no exception is thrown and every <option> child is a primitive.
 *
 * Run: npm run test:smoke
 */
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import data from '../public/dropdown_data.json'
import VehicleStep from '../src/components/VehicleStep.jsx'
import SpecStep, { scopedOptions } from '../src/components/SpecStep.jsx'

let failures = 0
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  ok   ${name}`)
  } else {
    failures += 1
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`)
  }
}

/** Pull [value, text] pairs out of rendered <option> tags. */
function optionPairs(html) {
  const out = []
  const re = /<option value="([^"]*)">([^<]*)<\/option>/g
  let m
  while ((m = re.exec(html))) out.push([m[1], m[2]])
  return out
}

function assertOptionsClean(name, html) {
  const pairs = optionPairs(html)
  const bad = pairs.filter(([v, t]) => v === '[object Object]' || t === '[object Object]')
  check(`${name}: ${pairs.length} options, all primitives`, pairs.length > 0 && bad.length === 0,
    bad.length ? `${bad.length} [object Object] options` : `${pairs.length} options found`)
  return pairs
}

const noop = () => {}
const EMPTY_SPEC = { trim: '', engine_cc: '', fuel_type: '', transmission: '', year: '', mileage: '', city: '' }

console.log('case 1: VehicleStep Toyota → Corolla')
let html = ''
try {
  html = renderToStaticMarkup(
    <VehicleStep data={data} brand="Toyota" model="Corolla" generation="" onPick={noop} />
  )
  check('renders without throwing', true)
} catch (e) {
  check('renders without throwing', false, String(e && e.message))
}
const pairs1 = assertOptionsClean('Toyota/Corolla selects', html)
check('contains "11th (E170) Generation" option',
  pairs1.some(([, t]) => t === '11th (E170) Generation'))

console.log('case 2: VehicleStep Honda → City')
try {
  html = renderToStaticMarkup(
    <VehicleStep data={data} brand="Honda" model="City" generation="" onPick={noop} />
  )
  check('renders without throwing', true)
} catch (e) {
  check('renders without throwing', false, String(e && e.message))
}
assertOptionsClean('Honda/City selects', html)

console.log('case 3: SpecStep Toyota → Corolla → 11th (E170) Generation')
try {
  html = renderToStaticMarkup(
    <SpecStep data={data} brand="Toyota" model="Corolla" generation="11th (E170) Generation"
      spec={EMPTY_SPEC} onPick={noop} errors={{}} />
  )
  check('renders without throwing', true)
} catch (e) {
  check('renders without throwing', false, String(e && e.message))
}
assertOptionsClean('Toyota/Corolla/11th selects', html)
const scoped = scopedOptions(data, 'Toyota', 'Corolla', '11th (E170) Generation')
check('scoped trims resolve to non-empty primitives',
  Array.isArray(scoped?.trims) && scoped.trims.length > 0 &&
  scoped.trims.every((t) => typeof t === 'string' || typeof t === 'number'),
  `trims=${JSON.stringify((scoped?.trims || []).slice(0, 3))}`)

console.log('case 4: SpecStep Honda → City (no generation)')
try {
  html = renderToStaticMarkup(
    <SpecStep data={data} brand="Honda" model="City" generation=""
      spec={EMPTY_SPEC} onPick={noop} errors={{}} />
  )
  check('renders without throwing', true)
} catch (e) {
  check('renders without throwing', false, String(e && e.message))
}
assertOptionsClean('Honda/City spec selects', html)

console.log('case 5: full catalogue walk — no non-primitive dropdown entries')
let objCount = 0
let badPaths = []
const ARRAY_FIELDS = ['trims', 'engines', 'fuels', 'transmissions', 'years']
for (const [brand, models] of Object.entries(data)) {
  for (const [modelName, m] of Object.entries(models)) {
    // generations: must be string or {generation: string} (VehicleStep extracts both)
    for (const g of m.generations || []) {
      const ok = typeof g === 'string' || (g && typeof g === 'object' && typeof g.generation === 'string')
      if (!ok) { objCount++; badPaths.push(`${brand}/${modelName}/generations`) }
    }
    for (const f of ARRAY_FIELDS) {
      for (const v of m[f] || []) {
        if (v !== null && typeof v !== 'string' && typeof v !== 'number') {
          objCount++; badPaths.push(`${brand}/${modelName}/${f}`)
        }
      }
    }
    for (const [genName, s] of Object.entries(m.by_generation || {})) {
      for (const f of ARRAY_FIELDS) {
        for (const v of s[f] || []) {
          if (v !== null && typeof v !== 'string' && typeof v !== 'number') {
            objCount++; badPaths.push(`${brand}/${modelName}/by_generation/${genName}/${f}`)
          }
        }
      }
    }
  }
}
check('all dropdown arrays contain only primitives', objCount === 0,
  objCount ? `${objCount} bad entries, e.g. ${badPaths.slice(0, 3).join(', ')}` : '')

console.log(failures === 0 ? '\nSMOKE TEST: GREEN' : `\nSMOKE TEST: ${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
