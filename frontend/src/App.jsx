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

function detectGender(name) {
  const n = name.toLowerCase()
  if (/\b(hombre|men|caballero|him|for him|male|masculin)\b|lady speed stick/.test(n) === false &&
      /\b(axe|old spice)\b/.test(n)) return 'Hombre'
  if (/\b(mujer|dama|lady|woman|her|for her|female|ella|women)\b/.test(n)) return 'Mujer'
  if (/\b(hombre|men|caballero|him|for him|male|masculin)\b/.test(n)) return 'Hombre'
  return 'Unisex'
}

function enrichProduct(p) {
  return {
    ...p,
    brand:  detectBrand(p.productName),
    type:   detectType(p.productName),
    gender: detectGender(p.productName),
  }
}

function toggle(arr, item) {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]
}

export default function App() {
  const [results, setResults] = useState([])
  const [storeStatus, setStoreStatus] = useState({})
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [searched, setSearched] = useState(false)

  const [historyProduct, setHistoryProduct] = useState(null)
  const [activeStores,  setActiveStores]  = useState([])
  const [activeBrands,  setActiveBrands]  = useState([])
  const [activeGenders, setActiveGenders] = useState([])
  const [activeTypes,   setActiveTypes]   = useState([])

  function resetFilters() {
    setActiveStores([]); setActiveBrands([]); setActiveGenders([]); setActiveTypes([])
  }

  function handleSearch(term) {
    if (!term.trim()) return
    setQuery(term); setLoading(true); setSearched(true)
    setResults([]); setStoreStatus({}); resetFilters()

    const source = new EventSource(`/api/search?q=${encodeURIComponent(term)}`)

    source.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'store' && data.results.length > 0) {
        setResults(prev =>
          [...prev, ...data.results.map(enrichProduct)].sort((a, b) => a.price - b.price)
        )
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

  // Valores únicos para filtros (ordenados)
  const stores  = [...new Set(results.map(r => r.store))].sort()
  const brands  = [...new Set(results.map(r => r.brand).filter(Boolean))].sort()
  const types   = [...new Set(results.map(r => r.type).filter(Boolean))].sort()
  const genders = [...new Set(results.map(r => r.gender).filter(Boolean))].sort()

  const filtered = results
    .filter(r => activeStores.length  === 0 || activeStores.includes(r.store))
    .filter(r => activeBrands.length  === 0 || activeBrands.includes(r.brand))
    .filter(r => activeGenders.length === 0 || activeGenders.includes(r.gender))
    .filter(r => activeTypes.length   === 0 || activeTypes.includes(r.type))
    .sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price)

  const hasFilters = results.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-800 text-white py-6 px-4 shadow">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold">Comparador de Precios Chile</h1>
          <p className="text-blue-200 text-sm mt-1">Higiene y belleza en un solo lugar</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Barra de búsqueda prominente */}
        <SearchBar onSearch={handleSearch} loading={loading} />

        {/* Categorías rápidas */}
        <div className="flex flex-wrap gap-2 mt-4">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => handleSearch(cat)}
              className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-full text-sm hover:bg-blue-50 transition">
              {cat}
            </button>
          ))}
        </div>

        {/* Estado de tiendas (mientras busca) */}
        {searched && Object.keys(storeStatus).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(storeStatus).map(([store, status]) => (
              <span key={store}
                className={`text-xs px-2 py-1 rounded-full ${
                  status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                {store}: {status}
              </span>
            ))}
          </div>
        )}

        {/* Filtros */}
        {hasFilters && (
          <FilterBar
            stores={stores}   activeStores={activeStores}   onToggleStore={s  => setActiveStores(toggle(activeStores, s))}
            brands={brands}   activeBrands={activeBrands}   onToggleBrand={b  => setActiveBrands(toggle(activeBrands, b))}
            genders={genders} activeGenders={activeGenders} onToggleGender={g => setActiveGenders(toggle(activeGenders, g))}
            types={types}     activeTypes={activeTypes}     onToggleType={t   => setActiveTypes(toggle(activeTypes, t))}
            sortOrder={sortOrder} onSortChange={setSortOrder}
            totalResults={filtered.length}
          />
        )}

        {/* Resultados */}
        <ResultsTable results={filtered} loading={loading} searched={searched} query={query}
          onHistory={setHistoryProduct} />
      </main>

      {/* Modal historial */}
      {historyProduct && (
        <PriceHistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
    </div>
  )
}
