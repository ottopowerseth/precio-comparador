const TTL_MS = 30 * 60 * 1000 // 30 minutos

const store = new Map()

export function getCache(query) {
  const key = query.toLowerCase().trim()
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > TTL_MS) {
    store.delete(key)
    return null
  }
  return entry.results
}

export function setCache(query, results) {
  // No cachear búsquedas sin resultados
  if (!results || results.results?.length === 0) return
  const key = query.toLowerCase().trim()
  store.set(key, { timestamp: Date.now(), results })
}
