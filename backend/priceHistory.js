import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR  = join(__dirname, 'data')
const FILE      = join(DATA_DIR, 'history.json')
const MAX_DAYS  = 90

function load() {
  if (!existsSync(FILE)) return {}
  try { return JSON.parse(readFileSync(FILE, 'utf-8')) } catch { return {} }
}

function save(data) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(data))
}

function makeKey(productName, store) {
  return productName
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() + '|' + store.toLowerCase()
}

export function recordPrices(products) {
  const history = load()
  const today   = new Date().toISOString().split('T')[0]

  for (const p of products) {
    if (!p.productName || !p.price) continue
    const key = makeKey(p.productName, p.store)

    if (!history[key]) history[key] = { productName: p.productName, store: p.store, entries: [] }

    const entries = history[key].entries
    const last    = entries[entries.length - 1]

    if (last && last.date === today) {
      last.price = p.price  // actualizar precio de hoy
    } else {
      entries.push({ date: today, price: p.price })
      if (entries.length > MAX_DAYS) entries.shift()
    }
  }

  save(history)
}

export function getProductHistory(productName, store) {
  const history = load()
  const key     = makeKey(productName, store)
  return history[key] || null
}
