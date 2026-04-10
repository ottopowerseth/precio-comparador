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

const app = express()
app.use(cors())
app.use(express.json())

const SCRAPERS = [
  { key: 'mercadolibre', fn: scrapeMercadoLibre },
  { key: 'lamundial',    fn: scrapeLaMundial },
  { key: 'liquimax',     fn: scrapeLiquimax },
  { key: 'preunic',      fn: scrapePreunic },
  { key: 'espol',        fn: scrapeEspol },
  { key: 'maicao',       fn: scrapeMaicao },
]

app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').trim()
  if (!query) return res.status(400).json({ error: 'Parámetro q requerido' })

  // Revisar caché
  const cached = getCache(query)
  if (cached) {
    console.log(`[cache hit] ${query}`)
    return res.json(cached)
  }

  console.log(`[search] ${query}`)

  const storeStatus = {}
  const allResults = []

  // Ejecutar scrapers con concurrencia limitada (máx 3 a la vez)
  const CONCURRENCY = 2
  let index = 0
  const mutex = []

  async function runNext() {
    while (index < SCRAPERS.length) {
      const { key, fn } = SCRAPERS[index++]
      try {
        const results = await Promise.race([
          fn(query),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 30000)
          ),
        ])
        allResults.push(...results)
        storeStatus[key] = 'ok'
      } catch (err) {
        console.error(`[${key}] error:`, err.message)
        storeStatus[key] = err.message === 'timeout' ? 'timeout' : 'error'
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, runNext))

  // Ordenar por precio ascendente
  allResults.sort((a, b) => a.price - b.price)

  const response = { query, results: allResults, storeStatus }
  setCache(query, response)
  res.json(response)
})

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3005
app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`))
