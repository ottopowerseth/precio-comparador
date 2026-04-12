import { config } from 'dotenv'
config()
import express from 'express'
import cors from 'cors'
import { getCache, setCache } from './cache.js'
import { scrapeMercadoLibre } from './scrapers/mercadolibre.js'
import { scrapeLaMundial } from './scrapers/lamundial.js'
import { scrapeLiquimax } from './scrapers/liquimax.js'
import { scrapePreunic } from './scrapers/preunic.js'
import { scrapeMaicao } from './scrapers/maicao.js'
import { scrapeEspol } from './scrapers/espol.js'
import { scrapeTrimaico } from './scrapers/trimaico.js'
import { recordPrices, getProductHistory } from './priceHistory.js'

const app = express()
app.use(cors())
app.use(express.json())

// Extrae el tamaño del nombre (ej: "400ml", "2L", "100g")
function extractSize(name) {
  const m = name.match(/\b(\d+[\.,]?\d*)\s*(ml|l|g|kg|gr|cc|oz)\b/i)
  return m ? `${m[1].replace(',', '.')}${m[2].toLowerCase()}` : ''
}

// Normaliza el nombre quitando puntuación y espacios extra
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Filtros por categoría: marca → tamaños permitidos (null = todos los tamaños)
// Marcas permitidas por categoría (todas las tallas, el frontend agrupa por tamaño)
const CATEGORY_FILTERS = {
  shampoo: [
    { brand: 'head & shoulders' },
    { brand: 'head shoulders'   },
    { brand: 'pantene'          },
    { brand: 'elvive'           },
    { brand: 'familand'         },
    { brand: 'dove'             },
    { brand: 'fructis'          },
    { brand: 'sedal'            },
  ],
  tinturas: [
    { brand: 'ilicit'      },
    { brand: 'nutrisse'    },
    { brand: 'cor intensa' },
    { brand: 'excellence'  },
    { brand: 'issue'       },
  ],
  desodorantes: [
    { brand: 'axe'              },
    { brand: 'dove'             },
    { brand: 'lady speed stick' },
    { brand: 'speed stick'      },
    { brand: 'nivea'            },
    { brand: 'rexona'           },
    { brand: 'old spice'        },
  ],
  'pastas de dientes': [
    { brand: 'colgate'    },
    { brand: 'pepsodent'  },
    { brand: 'aquafresh'  },
  ],
  jabones: [
    { brand: 'simonds' },
    { brand: 'dove'    },
    { brand: 'protex'  },
  ],
}

// Palabras excluidas por categoría
const CATEGORY_EXCLUDE = {
  shampoo:      ['acondicionador', 'balsamo', 'balm', 'conditioner', 'acond', 'mascarilla', 'tratamiento'],
  desodorantes: ['shampoo', 'jabon', 'champu'],
  jabones:      ['shampoo', 'champu', 'desodorante'],
}

// Al menos una de estas palabras debe estar en el nombre del producto
// (evita que un Dove shampoo aparezca en desodorantes, etc.)
const CATEGORY_MUST_CONTAIN = {
  shampoo:             ['shampoo', 'champu'],
  tinturas:            ['tintura', 'tinte', 'coloraci', 'ilicit', 'nutrisse', 'cor intensa', 'excellence', 'issue'],
  desodorantes:        ['desodorante', 'deo', 'aerosol', 'spray', 'barra', 'roll on', 'rollon', 'antitranspirante'],
  'pastas de dientes': ['pasta', 'dental', 'crema dental', 'gel dental', 'colgate', 'pepsodent', 'aquafresh'],
  jabones:             ['jabon', 'jab', 'pan de', 'simonds', 'protex'],
}

// Aplica filtro de categoría si la búsqueda coincide con una categoría definida
function applyQueryFilter(query, results) {
  const q = normalizeName(query)
  const categoryKey = Object.keys(CATEGORY_FILTERS).find(k => q.includes(normalizeName(k)))
  if (!categoryKey) return results

  const excludeWords = (CATEGORY_EXCLUDE[categoryKey] || []).map(normalizeName)
  const mustContain  = (CATEGORY_MUST_CONTAIN[categoryKey] || []).map(normalizeName)
  const allowed      = CATEGORY_FILTERS[categoryKey]

  return results.filter(p => {
    const name = normalizeName(p.productName)
    // Descartar si contiene palabras excluidas
    if (excludeWords.some(w => name.includes(w))) return false
    // Descartar si no tiene ninguna palabra clave de la categoría
    if (mustContain.length > 0 && !mustContain.some(w => name.includes(w))) return false
    // Verificar que la marca esté en la lista permitida
    return allowed.some(({ brand }) => name.includes(normalizeName(brand)))
  })
}

// Deduplica resultados de una tienda: mismo nombre+tamaño = duplicado
function deduplicateStore(results) {
  const seen = new Set()
  return results.filter(p => {
    const size = extractSize(p.productName)
    const name = normalizeName(p.productName)
    const key = `${name}|${size}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Lista de marcas conocidas para detectar en el nombre del producto
const KNOWN_BRANDS_NORM = [
  'head shoulders', 'head & shoulders', 'pantene', 'elvive', 'familand',
  'dove', 'fructis', 'sedal', 'ilicit', 'nutrisse', 'cor intensa',
  'excellence', 'issue', 'axe', 'lady speed stick', 'speed stick',
  'nivea', 'rexona', 'old spice', 'colgate', 'pepsodent', 'aquafresh',
  'simonds', 'protex',
]

function detectBrandNorm(nameLower) {
  return KNOWN_BRANDS_NORM.find(b => nameLower.includes(b)) || null
}

// Para categorías: un producto por marca+tamaño por tienda (evita múltiples variedades)
function deduplicateBrandSize(results) {
  const seen = new Set()
  return results.filter(p => {
    const name = normalizeName(p.productName)
    const size = extractSize(p.productName) || 'nosize'
    const brand = detectBrandNorm(name) || name.split(' ').slice(0, 2).join(' ')
    const key = `${brand}|${p.store}|${size}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Queries extra por categoría.
// all:       se corren en TODOS los scrapers (fetch + browser)
// fetchOnly: solo en scrapers sin browser (rápidos) — evita sobrecargar RAM del server
// Queries extra por marca — brand+keyword para resultados precisos y evitar contaminación
// all:       todos los scrapers (fetch + browser)
// fetchOnly: solo scrapers sin browser (menos RAM)
const CATEGORY_EXTRA_BRAND_QUERIES = {
  'shampoo': {
    all:       ['familand shampoo', 'head shoulders shampoo', 'pantene shampoo'],
    fetchOnly: ['elvive shampoo', 'dove shampoo', 'fructis shampoo', 'sedal shampoo'],
  },
  'tinturas': {
    // Todas las marcas en all → todos los scrapers (fetch + browser) buscan cada marca
    all:       ['ilicit tintura', 'issue tintura', 'nutrisse tintura', 'cor intensa tintura', 'excellence tintura'],
    fetchOnly: [],
  },
  'desodorantes': {
    all:       ['lady speed stick desodorante', 'dove desodorante', 'rexona desodorante'],
    fetchOnly: ['axe desodorante', 'nivea desodorante', 'old spice desodorante', 'speed stick desodorante'],
  },
  'pastas de dientes': {
    all:       ['colgate pasta dental'],
    fetchOnly: ['pepsodent pasta dental', 'aquafresh pasta dental'],
  },
  'jabones': {
    all:       [],
    fetchOnly: ['dove jabon', 'protex jabon', 'simonds jabon'],
  },
}

// Categorías donde mostramos múltiples productos por marca (sin colapsar por tamaño)
const CATEGORIES_USE_STORE_DEDUP = new Set(['pastas de dientes', 'jabones'])

const SCRAPERS = [
  // { key: 'mercadolibre', fn: scrapeMercadoLibre },
  { key: 'lamundial',    fn: scrapeLaMundial,  useBrowser: false },
  { key: 'liquimax',     fn: scrapeLiquimax,   useBrowser: false },
  { key: 'preunic',      fn: scrapePreunic,    useBrowser: true  },
  // Espol deshabilitado: todos los precios son placeholder $99,999 (WooCommerce sin precios reales)
  // { key: 'espol',        fn: scrapeEspol,   useBrowser: true  },
  { key: 'maicao',       fn: scrapeMaicao,     useBrowser: false },
  { key: 'trimaico',     fn: scrapeTrimaico,   useBrowser: true  },
]

// Ruta de streaming (SSE) — manda resultados tienda por tienda
app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').trim()
  if (!query) return res.status(400).json({ error: 'Parámetro q requerido' })

  // Caché: responder de inmediato con JSON normal
  const cached = getCache(query)
  if (cached) {
    console.log(`[cache hit] ${query}`)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.write(`data: ${JSON.stringify({ type: 'done', ...cached })}\n\n`)
    return res.end()
  }

  console.log(`[search] ${query}`)

  // Configurar SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // desactiva buffer de nginx

  const storeStatus = {}
  const allResults = []

  // Detectar si la búsqueda es una categoría conocida
  const qNorm = normalizeName(query)
  const categoryKey = Object.keys(CATEGORY_EXTRA_BRAND_QUERIES).find(k => qNorm.includes(normalizeName(k)))
  const categoryConfig = categoryKey ? CATEGORY_EXTRA_BRAND_QUERIES[categoryKey] : { all: [], fetchOnly: [] }
  const totalExtra = (categoryConfig.all?.length || 0) + (categoryConfig.fetchOnly?.length || 0)

  console.log(categoryKey ? `[category] ${categoryKey} → generic + ${totalExtra} extra queries (${categoryConfig.all?.length} all, ${categoryConfig.fetchOnly?.length} fetchOnly)` : `[search] simple query`)

  for (const { key, fn, useBrowser } of SCRAPERS) {
    try {
      // Siempre buscar con el query genérico
      const rawResults = await Promise.race([
        fn(query),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 45000)),
      ])

      // Para categorías: scrapers fetch corren all+fetchOnly; scrapers browser solo corren all
      const extraQueries = useBrowser
        ? (categoryConfig.all || [])
        : [...(categoryConfig.all || []), ...(categoryConfig.fetchOnly || [])]

      for (const bq of extraQueries) {
        try {
          const extra = await Promise.race([
            fn(bq),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000))
          ])
          if (extra?.length > 0) rawResults.push(...extra)
        } catch (e) {
          console.error(`  [${key}] extra query "${bq}" failed:`, e.message)
        }
      }

      const dedupFn = (categoryKey && !CATEGORIES_USE_STORE_DEDUP.has(categoryKey)) ? deduplicateBrandSize : deduplicateStore
      const unique = applyQueryFilter(query, dedupFn(rawResults))
      recordPrices(unique)
      allResults.push(...unique)
      storeStatus[key] = 'ok'
      res.write(`data: ${JSON.stringify({ type: 'store', store: key, results: unique, status: 'ok' })}\n\n`)
    } catch (err) {
      console.error(`[${key}] error:`, err.message)
      storeStatus[key] = err.message === 'timeout' ? 'timeout' : 'error'
      res.write(`data: ${JSON.stringify({ type: 'store', store: key, results: [], status: storeStatus[key] })}\n\n`)
    }
  }

  // Ordenar y guardar en caché
  allResults.sort((a, b) => a.price - b.price)
  const response = { query, results: allResults, storeStatus }
  setCache(query, response)

  // Señal de fin
  res.write(`data: ${JSON.stringify({ type: 'done', ...response })}\n\n`)
  res.end()
})

// Historial de precios
app.get('/api/history', (req, res) => {
  const { product, store } = req.query
  if (!product || !store) return res.status(400).json({ error: 'Faltan parámetros' })
  const data = getProductHistory(product, store)
  if (!data) return res.json({ entries: [] })
  res.json(data)
})

// Lookup de código de barra vía Open Food Facts (gratis)
app.get('/api/barcode/:code', async (req, res) => {
  const { code } = req.params
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`)
    const data = await r.json()
    if (data.status === 1) {
      const name = data.product.product_name_es || data.product.product_name || ''
      return res.json({ found: true, name: name || code })
    }
    res.json({ found: false, name: code })
  } catch {
    res.json({ found: false, name: code })
  }
})

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3005
app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`))
