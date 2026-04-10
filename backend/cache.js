const TTL_MS = 60 * 60 * 1000 // 1 hora

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
  const key = query.toLowerCase().trim()
  store.set(key, { timestamp: Date.now(), results })
}
