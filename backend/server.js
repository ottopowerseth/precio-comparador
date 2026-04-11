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
const CATEGORY_FILTERS = {
  shampoo: [
    { brand: 'head & shoulders', sizes: ['180', '375'] },
    { brand: 'head shoulders',   sizes: ['180', '375'] },
    { brand: 'hs ',              sizes: ['180', '375'] },
    { brand: 'pantene',          sizes: ['400'] },
    { brand: 'elvive',           sizes: ['370', '680'] },
    { brand: 'familand',         sizes: ['750'] },
    { brand: 'dove',             sizes: null },
    { brand: 'fructis',          sizes: null },
    { brand: 'sedal',            sizes: null },
  ],
  tinturas: [
    { brand: 'ilicit',           sizes: null },
    { brand: 'nutrisse',         sizes: null },
    { brand: 'cor intensa',      sizes: null },
    { brand: 'excellence',       sizes: null },
    { brand: 'issue',            sizes: null },
  ],
  desodorantes: [
    { brand: 'axe',              sizes: null },
    { brand: 'dove',             sizes: null },
    { brand: 'lady speed stick', sizes: null },
    { brand: 'speed stick',      sizes: null },
    { brand: 'nivea',            sizes: null },
    { brand: 'rexona',           sizes: null },
    { brand: 'old spice',        sizes: null },
  ],
  'pastas de dientes': [
    { brand: 'colgate',          sizes: null },
    { brand: 'pepsodent',        sizes: null },
    { brand: 'aquafresh',        sizes: null },
  ],
  jabones: [
    { brand: 'simonds',          sizes: null },
    { brand: 'dove',             sizes: null },
    { brand: 'protex',           sizes: null },
  ],
}

// Aplica filtro de categoría si la búsqueda coincide con una categoría definida
function applyQueryFilter(query, results) {
  const q = normalizeName(query)
  const categoryKey = Object.keys(CATEGORY_FILTERS).find(k => q.includes(normalizeName(k)))
  if (!categoryKey) return results

  const allowed = CATEGORY_FILTERS[categoryKey]
  return results.filter(p => {
    const name = normalizeName(p.productName)
    return allowed.some(({ brand, sizes }) => {
      if (!name.includes(normalizeName(brand))) return false
      if (!sizes) return true
      // Verificar que el nombre contiene uno de los tamaños permitidos
      return sizes.some(s => new RegExp(`\\b${s}\\s*(ml|l|g|gr|cc)`, 'i').test(p.productName))
    })
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

const SCRAPERS = [
  // { key: 'mercadolibre', fn: scrapeMercadoLibre },
  { key: 'lamundial',    fn: scrapeLaMundial },
  { key: 'liquimax',     fn: scrapeLiquimax },
  { key: 'preunic',      fn: scrapePreunic },
  { key: 'espol',        fn: scrapeEspol },
  { key: 'maicao',       fn: scrapeMaicao },
  { key: 'trimaico',     fn: scrapeTrimaico },
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

  // Ejecutar scrapers de forma secuencial para no sobrecargar RAM
  for (const { key, fn } of SCRAPERS) {
    try {
      const results = await Promise.race([
        fn(query),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 45000)
        ),
      ])
      const unique = applyQueryFilter(query, deduplicateStore(results))
      allResults.push(...unique)
      storeStatus[key] = 'ok'
      // Mandar resultados de esta tienda al frontend
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
