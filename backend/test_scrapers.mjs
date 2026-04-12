/**
 * test_scrapers.mjs — Auditoría de scrapers por tienda × categoría
 *
 * Uso:
 *   node test_scrapers.mjs              → corre los 30 tests
 *   node test_scrapers.mjs lamundial    → solo una tienda
 *   node test_scrapers.mjs shampoo      → solo una categoría
 *
 * Nota: los scrapers browser-based (preunic, espol, trimaico) requieren
 * que Playwright esté instalado. Se cierran solos al terminar.
 */

import { scrapeLaMundial }  from './scrapers/lamundial.js'
import { scrapeLiquimax }   from './scrapers/liquimax.js'
import { scrapePreunic }    from './scrapers/preunic.js'
import { scrapeEspol }      from './scrapers/espol.js'
import { scrapeMaicao }     from './scrapers/maicao.js'
import { scrapeTrimaico }   from './scrapers/trimaico.js'
import { closeBrowser }     from './browser.js'

// ─── Definición de tiendas ───────────────────────────────────────────────────
const STORES = [
  { key: 'lamundial', fn: scrapeLaMundial, label: 'La Mundial' },
  { key: 'liquimax',  fn: scrapeLiquimax,  label: 'Liquimax'   },
  { key: 'preunic',   fn: scrapePreunic,   label: 'Preunic'    },
  { key: 'espol',     fn: scrapeEspol,     label: 'Espol'      },
  { key: 'maicao',    fn: scrapeMaicao,    label: 'Maicao'     },
  { key: 'trimaico',  fn: scrapeTrimaico,  label: 'Trimaico'   },
]

// ─── Definición de categorías y queries ─────────────────────────────────────
const CATEGORIES = [
  {
    key:     'shampoo',
    label:   'Shampoo',
    query:   'shampoo',           // query genérico para la tienda
    probes:  ['head shoulders 375ml', 'pantene 400ml', 'fructis', 'dove shampoo', 'sedal'],
  },
  {
    key:     'tinturas',
    label:   'Tinturas',
    query:   'tinturas',
    probes:  ['nutrisse cor intensa', 'excellence', 'issue tintura', 'ilicit'],
  },
  {
    key:     'desodorantes',
    label:   'Desodorantes',
    query:   'desodorante',
    probes:  ['rexona spray', 'axe desodorante', 'dove desodorante', 'nivea desodorante'],
  },
  {
    key:     'pastas',
    label:   'Pastas',
    query:   'pastas de dientes',
    probes:  ['colgate total', 'pepsodent', 'aquafresh'],
  },
  {
    key:     'jabones',
    label:   'Jabones',
    query:   'jabon',
    probes:  ['protex', 'dove jabon', 'simonds'],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pad(str, len) {
  const s = String(str)
  return s.length >= len ? s.substring(0, len) : s + ' '.repeat(len - s.length)
}

function formatMs(ms) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

async function runOne(storeFn, query, label) {
  const t0 = Date.now()
  let results = []
  let error = null
  try {
    results = await Promise.race([
      storeFn(query),
      new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT 45s')), 45000)),
    ])
  } catch (e) {
    error = e.message
  }
  const elapsed = Date.now() - t0
  return { results: results || [], error, elapsed }
}

function statusLabel(results, error) {
  if (error) return 'ERROR'
  if (results.length === 0) return 'WARN '
  return 'OK   '
}

// ─── Test de una combinación tienda × categoría ──────────────────────────────
async function testCombination(store, category) {
  const { results, error, elapsed } = await runOne(store.fn, category.query, category.label)

  const status = statusLabel(results, error)
  const prefix = `[${pad(store.key.toUpperCase(), 10)}] [${pad(category.label.toUpperCase(), 11)}] [${status}]`

  if (error) {
    console.log(`${prefix} ERROR: ${error} (${formatMs(elapsed)})`)
  } else if (results.length === 0) {
    console.log(`${prefix} 0 resultados para query="${category.query}" (${formatMs(elapsed)})`)
  } else {
    const sample = results[0]
    const sampleStr = `"${sample.productName.substring(0, 40)}" → ${sample.priceFormatted}`
    console.log(`${prefix} ${results.length} resultados (${formatMs(elapsed)}) | Muestra: ${sampleStr}`)
  }

  return { count: results.length, error, elapsed }
}

// ─── Test de 5 queries de referencia por tienda ──────────────────────────────
async function testProbes(store) {
  console.log(`\n  ── Probes para ${store.label} ──`)
  for (const category of CATEGORIES) {
    for (const probe of category.probes) {
      const { results, error, elapsed } = await runOne(store.fn, probe, probe)
      const status = error ? 'ERROR' : results.length === 0 ? 'WARN ' : 'OK   '
      const count = results.length
      const sample = results[0] ? `"${results[0].productName.substring(0, 35)}" ${results[0].priceFormatted}` : ''
      console.log(`  [${status}] [${pad(category.label, 10)}] "${pad(probe, 30)}" → ${count} resultados ${sample ? '| ' + sample : ''} (${formatMs(elapsed)})`)
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const filterStore    = process.argv[2] ? process.argv[2].toLowerCase() : null
  const filterCategory = process.argv[2] ? process.argv[2].toLowerCase() : null

  const stores     = filterStore     ? STORES.filter(s => s.key.includes(filterStore))     : STORES
  const categories = filterCategory  ? CATEGORIES.filter(c => c.key.includes(filterCategory)) : CATEGORIES

  // Si filtramos por un argumento que matchea tienda, también corremos probes
  const runProbes = filterStore && stores.length === 1 && categories.length === CATEGORIES.length

  // Tabla de resultados: { storeKey: { categoryKey: { count, error } } }
  const table = {}
  for (const store of stores) table[store.key] = {}

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('  TEST DE SCRAPERS — tienda × categoría')
  console.log('══════════════════════════════════════════════════════════════\n')

  for (const store of stores) {
    console.log(`\n▶ ${store.label.toUpperCase()}`)
    for (const category of categories) {
      const result = await testCombination(store, category)
      table[store.key][category.key] = result
    }
  }

  if (runProbes) {
    await testProbes(stores[0])
  }

  // ─── Tabla resumen ────────────────────────────────────────────────────────
  console.log('\n\n══════════════════════════════════════════════════════════════')
  console.log('  TABLA RESUMEN')
  console.log('══════════════════════════════════════════════════════════════')

  const COL = 10
  const STORE_COL = 12
  const header = pad('', STORE_COL) + CATEGORIES.map(c => pad(c.label, COL)).join('| ')
  const divider = '-'.repeat(header.length)
  console.log('\n' + header)
  console.log(divider)

  for (const store of stores) {
    let row = pad(store.label, STORE_COL)
    for (const category of categories) {
      const cell = table[store.key][category.key]
      if (!cell) { row += pad('N/A', COL) + '| '; continue }
      if (cell.error) {
        row += pad('ERROR', COL) + '| '
      } else if (cell.count === 0) {
        row += pad('FAIL(0)', COL) + '| '
      } else if (cell.count < 3) {
        row += pad(`WARN(${cell.count})`, COL) + '| '
      } else {
        row += pad(`OK(${cell.count})`, COL) + '| '
      }
    }
    console.log(row)
  }

  console.log(divider)
  console.log('\nCriterios: OK=≥3 resultados | WARN=1-2 | FAIL=0 | ERROR=excepción\n')

  // ─── Diagnóstico rápido ───────────────────────────────────────────────────
  console.log('DIAGNÓSTICO:')
  for (const store of stores) {
    const results = Object.values(table[store.key])
    const errors  = results.filter(r => r.error).length
    const fails   = results.filter(r => !r.error && r.count === 0).length
    const ok      = results.filter(r => !r.error && r.count >= 3).length
    if (errors === results.length) {
      console.log(`  ✗ ${store.label}: BLOQUEADA (todos los tests fallaron con error)`)
    } else if (fails === results.length) {
      console.log(`  ✗ ${store.label}: BLOQUEADA (0 resultados en todas las categorías)`)
    } else if (ok < results.length / 2) {
      console.log(`  △ ${store.label}: PARCIAL (${ok}/${results.length} categorías con resultados)`)
    } else {
      console.log(`  ✓ ${store.label}: OK (${ok}/${results.length} categorías con resultados)`)
    }
  }
  console.log()
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => closeBrowser().catch(() => {}))
