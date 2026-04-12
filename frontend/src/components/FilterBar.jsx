import { useState } from 'react'

function ChevronIcon({ open }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function Section({ label, items, active, onToggle }) {
  const [open, setOpen] = useState(true)
  if (!items || items.length === 0) return null
  return (
    <div className="border-b border-gray-100 pb-3 mb-3 last:border-0 last:mb-0 last:pb-0">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 hover:text-gray-700">
        {label}
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="space-y-1">
          {items.map(item => (
            <label key={item} className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={active.includes(item)} onChange={() => onToggle(item)}
                className="accent-brand w-3.5 h-3.5 flex-shrink-0" />
              <span className={`text-xs leading-tight group-hover:text-brand transition ${active.includes(item) ? 'text-brand font-medium' : 'text-gray-600'}`}>
                {item}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FilterBar({
  stores, activeStores, onToggleStore,
  brands, activeBrands, onToggleBrand,
  sizes, activeSizes, onToggleSize,
  types, activeTypes, onToggleType,
  sortOrder, onSortChange,
  totalResults,
  hasResults,
  collapsed,
  onToggleCollapse,
}) {
  const anyActive = activeStores.length + activeBrands.length + activeSizes.length + activeTypes.length > 0

  // Sidebar colapsada: solo botón de expansión
  if (collapsed) {
    return (
      <aside className="flex-shrink-0" style={{ width: '32px' }}>
        <div className="sticky top-4">
          <button
            onClick={onToggleCollapse}
            title="Mostrar filtros"
            className="flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-brand hover:border-brand transition shadow-sm"
            style={{ width: '32px', height: '32px' }}
          >
            {/* Flecha apuntando derecha = expandir */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </aside>
    )
  }

  // Sidebar expandida
  return (
    <aside className="flex-shrink-0" style={{ width: '176px' }}>
      <div className="bg-white border border-gray-200 rounded-xl p-3 sticky top-4">

        {/* Ordenar + botón colapsar */}
        <div className="mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Ordenar</p>
            <button
              onClick={onToggleCollapse}
              title="Ocultar filtros"
              className="text-gray-300 hover:text-brand transition"
            >
              {/* Flecha apuntando izquierda = colapsar */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <select value={sortOrder} onChange={e => onSortChange(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand bg-white">
            <option value="asc">Menor precio</option>
            <option value="desc">Mayor precio</option>
          </select>
          {hasResults && (
            <p className="text-xs text-gray-400 mt-1.5 text-center">{totalResults} resultado{totalResults !== 1 ? 's' : ''}</p>
          )}
        </div>

        {anyActive && (
          <button onClick={() => {
            activeStores.forEach(onToggleStore)
            activeBrands.forEach(onToggleBrand)
            activeSizes.forEach(onToggleSize)
            activeTypes.forEach(onToggleType)
          }} className="w-full text-xs text-brand hover:text-brand-dark mb-3 text-left">
            Limpiar filtros
          </button>
        )}

        <Section label="Tipo"    items={types}  active={activeTypes}  onToggle={onToggleType} />
        <Section label="Marca"   items={brands} active={activeBrands} onToggle={onToggleBrand} />
        <Section label="Ml / Gr" items={sizes}  active={activeSizes}  onToggle={onToggleSize} />
        <Section label="Tienda"  items={stores} active={activeStores} onToggle={onToggleStore} />
      </div>
    </aside>
  )
}
