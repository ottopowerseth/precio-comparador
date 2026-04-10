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
      allResults.push(...results)
      storeStatus[key] = 'ok'
      // Mandar resultados de esta tienda al frontend
      res.write(`data: ${JSON.stringify({ type: 'store', store: key, results, status: 'ok' })}\n\n`)
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

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3005
app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`))
