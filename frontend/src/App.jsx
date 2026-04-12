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

// ─── Normalización avanzada de nombres ────────────────────────────────────────

const _STOPWORDS = [
  'pasta de dientes', 'crema dental', 'pasta dental',
  'en barra', 'en spray', 'para cabello',
  'shampoo', 'champu', 'desodorante', 'jabon',
  'tintura', 'original', 'spray', 'barra',
  'anticaries', 'grande', 'chico', 'mediano',
]

const _BRAND_NORMS = [
  [/head\s*&\s*shoulders|head&shoulders/gi, 'head shoulders'],
  [/\bh&s\b/gi,                             'head shoulders'],
  [/l[''']oreal|loreal/gi,                  'loreal'],
  [/garnier\s+fructis/gi,                   'fructis'],
  [/aqua\s*fresh/gi,                        'aquafresh'],
  [/old\s+spice/gi,                         'oldspice'],
]

const _KNOWN_BRANDS = [
  'head shoulders', 'lady speed stick', 'speed stick', 'cor intensa',
  'pantene', 'elvive', 'familand', 'fructis', 'sedal',
  'ilicit', 'nutrisse', 'excellence', 'issue',
  'axe', 'nivea', 'rexona', 'oldspice', 'dove',
  'colgate', 'pepsodent', 'aquafresh',
  'simonds', 'protex', 'loreal',
].sort((a, b) => b.length - a.length)

function _step1(name) {
  let n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const [pat, rep] of _BRAND_NORMS) n = n.replace(pat, rep)
  n = n.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  return n
}

function _removeStopwords(n) {
  for (const sw of _STOPWORDS) {
    const pattern = sw.replace(/\s+/g, '\\s+')
    n = n.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), ' ')
  }
  return n.replace(/\s+/g, ' ').trim()
}

function _extractBrand(n) {
  for (const brand of _KNOWN_BRANDS) {
    const pattern = brand.replace(/\s+/g, '\\s+')
    if (new RegExp(`\\b${pattern}\\b`).test(n)) return brand
  }
  return ''
}

function _extractSize(n) {
  const m = n.match(/\b(\d+)\s*(ml|gr|g|mg)\b/i)
  if (!m) return null
  let unit = m[2].toLowerCase()
  if (unit === 'gr') unit = 'g'
  return `${parseInt(m[1])}${unit}`
}

function _removeTerm(n, termStr) {
  if (!termStr) return n
  const pattern = termStr.replace(/\s+/g, '\\s+')
  return n.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), ' ').replace(/\s+/g, ' ').trim()
}

function _removeSizeFromName(n) {
  return n.replace(/\b\d+\s*(?:ml|gr|g|mg)\b/gi, ' ').replace(/\s+/g, ' ').trim()
}

function _applyProductNorms(namePart, brand) {
  namePart = namePart
    .replace(/\btriple\s+accion\b/g, 'triple accion')
    .replace(/\btriple\s*acci[oó]n\b/g, 'triple accion')
    .replace(/\btripleacci[oó]n\b/g, 'triple accion')
  if (brand === 'colgate') {
    namePart = namePart.replace(/\btriple\b(?!\s+accion)/g, 'triple accion')
  }
  return namePart.replace(/\s+/g, ' ').trim()
}

function _levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[a.length][b.length]
}

function _nameSimilarity(a, b) {
  const max = Math.max(a.length, b.length)
  return max === 0 ? 1 : (max - _levenshtein(a, b)) / max
}

function _buildGroupKey(name) {
  const n1 = _step1(name)
  const n2 = _removeStopwords(n1)
  const brand   = _extractBrand(n2)
  const sizeStr = _extractSize(n2)
  const sizeNum = sizeStr ? parseInt(sizeStr) : null
  let namePart = _removeTerm(n2, brand)
  namePart = _removeSizeFromName(namePart)
  namePart = _applyProductNorms(namePart, brand)
  const key = `${brand}_${namePart}_${sizeStr || 'nosize'}`
  return { brand, namePart, sizeStr, sizeNum, key }
}

// Extrae unidad de tamaño para precio_por_unidad (ml o g)
function _sizeUnit(sizeStr) {
  if (!sizeStr) return null
  const m = sizeStr.match(/[a-z]+$/i)
  return m ? m[0].toLowerCase() : null
}

// ─── Agrupación de productos ───────────────────────────────────────────────────

function groupProducts(items, sortOrder) {
  const groups = new Map()

  for (const item of items) {
    const { brand, namePart, sizeStr, sizeNum, key } = _buildGroupKey(item.productName)
    const sizeUnit = _sizeUnit(sizeStr)
    const price = typeof item.price === 'number'
      ? item.price
      : parseInt(String(item.price).replace(/[^0-9]/g, '')) || 0

    if (!groups.has(key)) {
      groups.set(key, {
        _brand: brand, _namePart: namePart, _sizeNum: sizeNum,
        id: key.replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').slice(0, 60),
        nombre: item.productName,
        imagen: item.imageUrl || '',
        tamaño: sizeStr || '',
        tamañoNum: sizeNum,
        tamañoUnit: sizeUnit,
        precio_minimo: Infinity,
        brand: item.brand,
        type: item.type,
        size: item.size,
        tiendas: [],
      })
    }

    const g = groups.get(key)
    if (!g.imagen && item.imageUrl) g.imagen = item.imageUrl
    if (item.productName.length > g.nombre.length) g.nombre = item.productName

    const precioPorUnidad = (sizeNum && sizeNum > 0 && price > 0)
      ? Math.round(price / sizeNum * 10) / 10
      : null

    g.tiendas.push({
      nombre: item.store,
      precio: price,
      priceFormatted: item.priceFormatted || `$${price.toLocaleString('es-CL')}`,
      precio_por_unidad: precioPorUnidad,
      url: item.productUrl,
      mejor_precio: false,
      productName: item.productName,
    })
  }

  // Paso de fusión fuzzy: grupos de una sola tienda sin marca se fusionan con
  // grupos con marca cuando nombre similar + sizeNum igual
  const groupList = Array.from(groups.values())
  const merged = new Set()

  for (let i = 0; i < groupList.length; i++) {
    if (merged.has(i)) continue
    const ga = groupList[i]
    for (let j = i + 1; j < groupList.length; j++) {
      if (merged.has(j)) continue
      const gb = groupList[j]
      const brandOk = !ga._brand || !gb._brand || ga._brand === gb._brand
      const sizeOk  = ga._sizeNum === gb._sizeNum  // null === null también es true
      if (!brandOk || !sizeOk) continue
      const sim = _nameSimilarity(ga._namePart, gb._namePart)
      if (sim >= 0.75) {
        // Fusionar gb en ga
        for (const t of gb.tiendas) ga.tiendas.push(t)
        if (!ga.imagen && gb.imagen) ga.imagen = gb.imagen
        if (gb.nombre.length > ga.nombre.length) ga.nombre = gb.nombre
        merged.add(j)
      }
    }
  }

  return groupList
    .filter((_, i) => !merged.has(i))
    .map(g => {
      g.tiendas.sort((a, b) => a.precio - b.precio)
      if (g.tiendas.length > 0) {
        g.tiendas[0].mejor_precio = true
        g.precio_minimo = g.tiendas[0].precio
      }
      return g
    })
    .sort((a, b) => sortOrder === 'asc'
      ? a.precio_minimo - b.precio_minimo
      : b.precio_minimo - a.precio_minimo)
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

function HomeButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Volver al inicio"
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '16px',
        background: 'white',
        border: '2px solid #1f2937',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <svg viewBox="0 0 24 24" fill="#ff8674" style={{ width: '20px', height: '20px' }}>
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    </button>
  )
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [homeKey, setHomeKey] = useState(0)

  const [activeStores, setActiveStores] = useState([])
  const [activeBrands, setActiveBrands] = useState([])
  const [activeSizes,  setActiveSizes]  = useState([])
  const [activeTypes,  setActiveTypes]  = useState([])

  function resetFilters() {
    setActiveStores([]); setActiveBrands([]); setActiveSizes([]); setActiveTypes([])
  }

  function handleHome() {
    setResults([])
    setStoreStatus({})
    setLoading(false)
    setQuery('')
    setSortOrder('asc')
    setSearched(false)
    setActiveCategory(null)
    setSidebarCollapsed(false)
    resetFilters()
    setHomeKey(k => k + 1)
  }

  function handleSearch(term, category = null) {
    if (!term.trim()) return
    setQuery(term); setLoading(true); setSearched(true)
    setActiveCategory(category)
    setResults([]); setStoreStatus({}); resetFilters()
    setSidebarCollapsed(true)

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

  const grouped = groupProducts(filtered, sortOrder)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand text-white py-4 px-4 shadow">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          {/* Botón Home */}
          <HomeButton onClick={handleHome} />

          <div>
            <h1 className="text-xl font-bold">Comparador De Precios Da-Ta By Otto</h1>
            <p className="text-white/70 text-xs mt-0.5">Higiene y belleza en un solo lugar</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <SearchBar key={homeKey} onSearch={handleSearch} loading={loading} />

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
            totalResults={grouped.length} hasResults={results.length > 0}
            collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          />
          <div className="flex-1 min-w-0">
            <ResultsTable groups={grouped} loading={loading} searched={searched} query={query}
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
