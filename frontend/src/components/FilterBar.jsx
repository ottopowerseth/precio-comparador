function FilterSection({ label, items, active, onToggle }) {
  if (!items || items.length === 0) return null
  return (
    <div className="flex items-start gap-2 flex-wrap">
      <span className="text-xs font-semibold text-gray-500 uppercase pt-0.5 whitespace-nowrap">{label}:</span>
      <div className="flex flex-wrap gap-1">
        {items.map(item => (
          <button key={item} onClick={() => onToggle(item)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              active.includes(item)
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}>
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FilterBar({
  stores, activeStores, onToggleStore,
  brands, activeBrands, onToggleBrand,
  genders, activeGenders, onToggleGender,
  types, activeTypes, onToggleType,
  sortOrder, onSortChange, totalResults,
}) {
  return (
    <div className="mt-6 bg-white border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
      <FilterSection label="Tipo"   items={types}   active={activeTypes}   onToggle={onToggleType} />
      <FilterSection label="Marca"  items={brands}  active={activeBrands}  onToggle={onToggleBrand} />
      <FilterSection label="Género" items={genders} active={activeGenders} onToggle={onToggleGender} />
      <FilterSection label="Tienda" items={stores}  active={activeStores}  onToggle={onToggleStore} />

      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase">Ordenar:</span>
        <select value={sortOrder} onChange={e => onSortChange(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="asc">Menor precio</option>
          <option value="desc">Mayor precio</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{totalResults} resultados</span>
      </div>
    </div>
  )
}
