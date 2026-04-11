import { useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import FilterBar from './components/FilterBar.jsx'
import ResultsTable from './components/ResultsTable.jsx'
import PriceHistoryModal from './components/PriceHistoryModal.jsx'

const CATEGORIES = ['Shampoo', 'Tinturas', 'Desodorantes', 'Pastas de dientes', 'Jabones']

const KNOWN_BRANDS = [
  'Lady Speed Stick', 'Head & Shoulders', 'Old Spice',
  'Pantene', 'Elvive', 'Familand', 'Dove', 'Fructis', 'Sedal',
  'Ilicit', 'Nutrisse', 'Cor Intensa', 'Excellence', 'Issue',
  'Axe', 'Speed Stick', 'Nivea', 'Rexona',
  'Colgate', 'Pepsodent', 'Aquafresh',
  'Simonds', 'Protex', 'Herbal Essences',
]

function detectBrand(name) {
  const n = name.toLowerCase()
  return KNOWN_BRANDS.find(b => n.includes(b.toLowerCase())) || null
}

function detectType(name) {
  const n = name.toLowerCase()
  if (/shampoo|champu|champú|sh\./.test(n)) return 'Shampoo'
  if (/pasta|dental|diente|dentif|colgate|pepsodent|aquafresh/.test(n)) return 'Pasta de dientes'
  if (/tintura|tinte|coloraci|issue|ilicit|nutrisse|excellence|cor intensa/.test(n)) return 'Tintura'
  if (/jabon|jabón|soap|protex|simonds/.test(n)) return 'Jabón'
  if (/desodoran|antitransp|\bdeo\b|axe|rexona|speed stick|old spice|nivea deo/.test(n)) return 'Desodorante'
  return null
}

function detectSize(name) {
  const m = name.match(/\b(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg|gr|cc|oz)\b/i)
  if (!m) return null
  const num = parseFloat(m[1].replace(',', '.'))
  const unit = m[2].toLowerCase()
  if (unit === 'l')  return `${num * 1000} ml`
  if (unit === 'kg') return `${num * 1000} g`
  if (unit === 'cc') return `${num} ml`
  if (unit === 'gr') return `${num} g`
  return `${num} ${unit}`
}

function enrichProduct(p) {
  return { ...p, brand: detectBrand(p.productName), type: detectType(p.productName), size: detectSize(p.productName) }
}

function toggle(arr, item) {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]
}

function sortSizes(sizes) {
  return [...sizes].sort((a, b) => {
    const parse = s => { const [n, u] = s.split(' '); return u === 'ml' ? parseFloat(n) : parseFloat(n) + 100000 }
    return parse(a) - parse(b)
  })
}

export default function App() {
  const [results, setResults] = useState([])
  const [storeStatus, setStoreStatus] = useState({})
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [searched, setSearched] = useState(false)
  const [historyProduct, setHistoryProduct] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)

  const [activeStores, setActiveStores] = useState([])
  const [activeBrands, setActiveBrands] = useState([])
  const [activeSizes,  setActiveSizes]  = useState([])
  const [activeTypes,  setActiveTypes]  = useState([])

  function resetFilters() {
    setActiveStores([]); setActiveBrands([]); setActiveSizes([]); setActiveTypes([])
  }

  function handleSearch(term, category = null) {
    if (!term.trim()) return
    setQuery(term); setLoading(true); setSearched(true)
    setActiveCategory(category)
    setResults([]); setStoreStatus({}); resetFilters()

    const source = new EventSource(`/api/search?q=${encodeURIComponent(term)}`)
    source.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'store' && data.results.length > 0) {
        setResults(prev => [...prev, ...data.results.map(enrichProduct)].sort((a, b) => a.price - b.price))
        setStoreStatus(prev => ({ ...prev, [data.store]: data.status }))
      } else if (data.type === 'store') {
        setStoreStatus(prev => ({ ...prev, [data.store]: data.status }))
      } else if (data.type === 'done') {
        setResults((data.results || []).map(enrichProduct))
        setStoreStatus(data.storeStatus || {})
        setLoading(false)
        source.close()
      }
    }
    source.onerror = () => { setLoading(false); source.close() }
  }

  const stores = [...new Set(results.map(r => r.store))].sort()
  const brands = [...new Set(results.map(r => r.brand).filter(Boolean))].sort()
  const types  = [...new Set(results.map(r => r.type).filter(Boolean))].sort()
  const sizes  = sortSizes([...new Set(results.map(r => r.size).filter(Boolean))])

  const filtered = results
    .filter(r => activeStores.length === 0 || activeStores.includes(r.store))
    .filter(r => activeBrands.length === 0 || activeBrands.includes(r.brand))
    .filter(r => activeSizes.length  === 0 || activeSizes.includes(r.size))
    .filter(r => activeTypes.length  === 0 || activeTypes.includes(r.type))
    .sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand text-white py-4 px-4 shadow">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-bold">Comparador De Precios Da-Ta By Otto</h1>
          <p className="text-white/70 text-xs mt-0.5">Higiene y belleza en un solo lugar</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <SearchBar onSearch={handleSearch} loading={loading} />

        {/* Categorías */}
        <div className="flex flex-wrap gap-2 mt-3">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => handleSearch(cat, cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
                activeCategory === cat
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-white border-brand-border text-brand hover:bg-brand-light'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Estado tiendas */}
        {searched && Object.keys(storeStatus).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(storeStatus).map(([store, status]) => (
              <span key={store} className={`text-xs px-2 py-0.5 rounded-full ${
                status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {store}: {status}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-5 mt-4">
          <FilterBar
            stores={stores}   activeStores={activeStores}  onToggleStore={s => setActiveStores(toggle(activeStores, s))}
            brands={brands}   activeBrands={activeBrands}  onToggleBrand={b => setActiveBrands(toggle(activeBrands, b))}
            sizes={sizes}     activeSizes={activeSizes}    onToggleSize={z  => setActiveSizes(toggle(activeSizes, z))}
            types={types}     activeTypes={activeTypes}    onToggleType={t  => setActiveTypes(toggle(activeTypes, t))}
            sortOrder={sortOrder} onSortChange={setSortOrder}
            totalResults={filtered.length} hasResults={results.length > 0}
          />
          <div className="flex-1 min-w-0">
            <ResultsTable results={filtered} loading={loading} searched={searched} query={query}
              onHistory={setHistoryProduct} />
          </div>
        </div>
      </div>

      {historyProduct && (
        <PriceHistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
    </div>
  )
}
