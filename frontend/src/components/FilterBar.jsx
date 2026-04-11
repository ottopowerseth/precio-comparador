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
                className="accent-blue-700 w-3.5 h-3.5 flex-shrink-0" />
              <span className={`text-xs leading-tight group-hover:text-blue-700 transition ${active.includes(item) ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
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
}) {
  const anyActive = activeStores.length + activeBrands.length + activeSizes.length + activeTypes.length > 0

  return (
    <aside className="w-44 flex-shrink-0">
      <div className="bg-white border border-gray-200 rounded-xl p-3 sticky top-4">
        {/* Ordenar */}
        <div className="mb-3 pb-3 border-b border-gray-100">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Ordenar</p>
          <select value={sortOrder} onChange={e => onSortChange(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
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
          }} className="w-full text-xs text-blue-600 hover:text-blue-800 mb-3 text-left">
            Limpiar filtros
          </button>
        )}

        <Section label="Tipo"   items={types}  active={activeTypes}  onToggle={onToggleType} />
        <Section label="Marca"  items={brands} active={activeBrands} onToggle={onToggleBrand} />
        <Section label="Ml / Gr" items={sizes} active={activeSizes}  onToggle={onToggleSize} />
        <Section label="Tienda" items={stores} active={activeStores} onToggle={onToggleStore} />
      </div>
    </aside>
  )
}
