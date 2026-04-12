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

// ─── Agrupador por categoría de producto ──────────────────────────────────────

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

// Tipo por defecto para marcas monomorfas (cuando el nombre no indica el tipo)
const _BRAND_DEFAULT_TYPE = {
  'colgate':   'pasta dental',
  'pepsodent': 'pasta dental',
  'aquafresh': 'pasta dental',
  'simonds':   'jabon',
  'protex':    'jabon',
}

// Nombres de display para tipos canónicos
const _TYPE_DISPLAY = {
  'shampoo':        'Shampoo',
  'acondicionador': 'Acondicionador',
  'crema peinar':   'Crema de Peinar',
  'spray':          'Spray',
  'barra':          'Barra',
  'roll on':        'Roll-On',
  'jabon':          'Jabón',
  'pasta dental':   'Pasta Dental',
  'tintura':        'Tintura',
  'desodorante':    'Desodorante',
}

// Nombres de display para marcas
const _BRAND_DISPLAY = {
  'head shoulders':  'Head & Shoulders',
  'lady speed stick':'Lady Speed Stick',
  'speed stick':     'Speed Stick',
  'cor intensa':     'Cor Intensa',
  'oldspice':        'Old Spice',
  'loreal':          "L'Oréal",
  'aquafresh':       'Aquafresh',
  'pepsodent':       'Pepsodent',
  'colgate':         'Colgate',
  'pantene':         'Pantene',
  'elvive':          'Elvive',
  'familand':        'Familand',
  'fructis':         'Fructis',
  'sedal':           'Sedal',
  'ilicit':          'Ilicit',
  'nutrisse':        'Nutrisse',
  'excellence':      'Excellence',
  'issue':           'Issue',
  'axe':             'Axe',
  'nivea':           'Nivea',
  'rexona':          'Rexona',
  'dove':            'Dove',
  'simonds':         'Simonds',
  'protex':          'Protex',
}

// Diccionario de tipos de producto.
// null  = variedad/aroma — ignorar, seguir buscando tipo real.
// string = tipo canónico — agrupar por este valor.
const _PRODUCT_TYPES_RAW = {
  'pasta de dientes':  'pasta dental',
  'crema para peinar': 'crema peinar',
  'crema de peinar':   'crema peinar',
  'celulas madre veg': null,
  'rizos definidos':   null,
  'luminous uv':       null,
  'bomba argan':       null,
  'bomba coco':        null,
  'celulas madre':     null,
  'acondicionador':    'acondicionador',
  'crema dental':      'pasta dental',
  'pasta dental':      'pasta dental',
  'gel dental':        'pasta dental',
  'pan de jabon':      'jabon',
  'crema peinar':      'crema peinar',
  'coloracion':        'tintura',
  'antitranspirante':  null,   // variedad — ignorar, seguir buscando
  'desodorante':       null,   // genérico; spray/barra lo sobreescribe
  'roll on':           'roll on',
  'rollon':            'roll on',
  'en barra':          'barra',
  'aerosol':           'spray',
  'shampoo':           'shampoo',
  'champu':            'shampoo',
  'tintura':           'tintura',
  'tinte':             'tintura',
  'jabon':             'jabon',
  'spray':             'spray',
  'barra':             'barra',
  'acond':             'acondicionador',
  'sh':                'shampoo',
}

// Normalizar claves (quitar tildes) y ordenar de más larga a más corta
const _PRODUCT_TYPES = Object.entries(_PRODUCT_TYPES_RAW)
  .map(([k, v]) => [k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), v])
  .sort((a, b) => b[0].length - a[0].length)

function _clean(name) {
  let n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const [pat, rep] of _BRAND_NORMS) n = n.replace(pat, rep)
  return n.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function _brand(n) {
  for (const b of _KNOWN_BRANDS) {
    if (new RegExp(`\\b${b.replace(/\s+/g, '\\s+')}\\b`).test(n)) return b
  }
  return ''
}

function _size(n) {
  const m = n.match(/\b(\d+)\s*(ml|gr|g|mg)\b/i)
  if (!m) return null
  let unit = m[2].toLowerCase(); if (unit === 'gr') unit = 'g'
  return `${parseInt(m[1])}${unit}`
}

// Recorre tipos de mayor a menor longitud.
// Cuando encuentra null sigue buscando (es variedad, no tipo).
function _type(n) {
  for (const [key, value] of _PRODUCT_TYPES) {
    if (new RegExp(`\\b${key.replace(/\s+/g, '\\s+')}\\b`).test(n)) {
      if (value !== null) return value
    }
  }
  return null
}

function getGroupKey(name) {
  const n      = _clean(name)
  const brand  = _brand(n)
  const size   = _size(n)
  const type   = _type(n) || _BRAND_DEFAULT_TYPE[brand] || ''
  const key    = `${brand}_${type}_${size || 'nosize'}`
  const sizeNum = size ? parseInt(size) : null
  const sizeUnit = size ? size.replace(/\d+/, '') : null

  const brandDisp = _BRAND_DISPLAY[brand] || (brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : '')
  const typeDisp  = _TYPE_DISPLAY[type] || (type ? type.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '')
  const canonicalName = [brandDisp, typeDisp, size || ''].filter(Boolean).join(' ')

  return { brand, type, size, sizeNum, sizeUnit, key, canonicalName }
}

// Separa tiendas en subgrupos si hay salto de precio > 40%
function _splitByPrice(tiendas, key) {
  if (tiendas.length < 2) return [tiendas]
  const sorted = [...tiendas].sort((a, b) => a.precio - b.precio)
  if (sorted[sorted.length - 1].precio / sorted[0].precio <= 1.4) return [sorted]

  let maxRatio = 0, splitIdx = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const ratio = sorted[i + 1].precio / sorted[i].precio
    if (ratio > maxRatio) { maxRatio = ratio; splitIdx = i }
  }
  const g1 = sorted.slice(0, splitIdx + 1)
  const g2 = sorted.slice(splitIdx + 1)
  console.log(`[AGRUPADOR] [SPLIT] "${key}" separado en 2 grupos por diferencia > 40% ($${g1[g1.length-1].precio} vs $${g2[0].precio})`)
  return [g1, g2]
}

// ─── Agrupación de productos ───────────────────────────────────────────────────

function groupProducts(items, sortOrder) {
  const groups = new Map()

  for (const item of items) {
    const { brand, type, size, sizeNum, sizeUnit, key, canonicalName } = getGroupKey(item.productName)
    const price = typeof item.price === 'number'
      ? item.price
      : parseInt(String(item.price).replace(/[^0-9]/g, '')) || 0

    if (!groups.has(key)) {
      groups.set(key, {
        id: key.replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').slice(0, 60),
        nombre: canonicalName || item.productName,
        imagen: item.imageUrl || '',
        tamaño: size || '',
        tamañoNum: sizeNum,
        tamañoUnit: sizeUnit,
        precio_minimo: Infinity,
        brand,
        type: _TYPE_DISPLAY[type] || type,
        size: size || '',
        tiendas: [],
      })
    }

    const g = groups.get(key)
    if (!g.imagen && item.imageUrl) g.imagen = item.imageUrl

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

  // Aplanar grupos aplicando split de precio
  const result = []
  for (const [key, g] of groups) {
    const subgroups = _splitByPrice(g.tiendas, key)
    subgroups.forEach((tiendas, idx) => {
      const suffix = idx > 0 ? `-${idx + 1}` : ''
      result.push({ ...g, id: g.id + suffix, tiendas })
    })
  }

  return result
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
    const parse = s => {
      const m = s.match(/^(\d+)(ml|g|mg)$/)
      if (!m) return 0
      return m[2] === 'ml' ? parseInt(m[1]) : parseInt(m[1]) + 100000
    }
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

  // Agrupar todos los resultados y derivar filtros de los grupos
  const allGrouped = groupProducts(results, sortOrder)

  const stores = [...new Set(results.map(r => r.store))].sort()
  const brands = [...new Set(allGrouped.map(g => g.brand).filter(Boolean))].sort()
  const types  = [...new Set(allGrouped.map(g => g.type).filter(Boolean))].sort()
  const sizes  = sortSizes([...new Set(allGrouped.map(g => g.tamaño).filter(Boolean))])

  // Filtrar grupos (no resultados planos)
  const grouped = allGrouped
    .filter(g => activeStores.length === 0 || g.tiendas.some(t => activeStores.includes(t.nombre)))
    .filter(g => activeBrands.length === 0 || activeBrands.includes(g.brand))
    .filter(g => activeSizes.length  === 0 || activeSizes.includes(g.tamaño))
    .filter(g => activeTypes.length  === 0 || activeTypes.includes(g.type))

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
