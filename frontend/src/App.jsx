import { useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import FilterBar from './components/FilterBar.jsx'
import ResultsTable from './components/ResultsTable.jsx'

const CATEGORIES = ['Shampoo', 'Tinturas', 'Desodorantes', 'Pastas de dientes', 'Jabones']

export default function App() {
  const [results, setResults] = useState([])
  const [storeStatus, setStoreStatus] = useState({})
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [activeStores, setActiveStores] = useState([])
  const [searched, setSearched] = useState(false)

  async function handleSearch(term) {
    if (!term.trim()) return
    setQuery(term)
    setLoading(true)
    setSearched(true)
    setResults([])
    setStoreStatus({})

    try {
      const API = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${API}/api/search?q=${encodeURIComponent(term)}`)
      const data = await res.json()
      setResults(data.results || [])
      setStoreStatus(data.storeStatus || {})
      setActiveStores([]) // reset filtros
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const stores = [...new Set(results.map(r => r.store))]

  const filtered = results
    .filter(r => activeStores.length === 0 || activeStores.includes(r.store))
    .sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white py-6 px-4 shadow">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold">Comparador de Precios Chile</h1>
          <p className="text-blue-200 text-sm mt-1">Higiene y belleza en un solo lugar</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Búsqueda */}
        <SearchBar onSearch={handleSearch} loading={loading} />

        {/* Categorías rápidas */}
        <div className="flex flex-wrap gap-2 mt-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleSearch(cat)}
              className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-full text-sm hover:bg-blue-50 transition"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Estado de tiendas */}
        {searched && !loading && Object.keys(storeStatus).length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {Object.entries(storeStatus).map(([store, status]) => (
              <span
                key={store}
                className={`text-xs px-2 py-1 rounded-full ${
                  status === 'ok'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {store}: {status}
              </span>
            ))}
          </div>
        )}

        {/* Filtros */}
        {results.length > 0 && (
          <FilterBar
            stores={stores}
            activeStores={activeStores}
            onToggleStore={store =>
              setActiveStores(prev =>
                prev.includes(store) ? prev.filter(s => s !== store) : [...prev, store]
              )
            }
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            totalResults={filtered.length}
          />
        )}

        {/* Resultados */}
        <ResultsTable results={filtered} loading={loading} searched={searched} query={query} />
      </main>
    </div>
  )
}
