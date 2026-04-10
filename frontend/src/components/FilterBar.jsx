export default function FilterBar({ stores, activeStores, onToggleStore, sortOrder, onSortChange, totalResults }) {
  return (
    <div className="mt-6 bg-white border rounded-lg p-4 flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 uppercase">Tienda:</span>
        {stores.map(store => (
          <label key={store} className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={activeStores.includes(store)}
              onChange={() => onToggleStore(store)}
              className="accent-blue-700"
            />
            <span className="text-sm text-gray-700">{store}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs font-semibold text-gray-500 uppercase">Ordenar:</span>
        <select
          value={sortOrder}
          onChange={e => onSortChange(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="asc">Menor precio</option>
          <option value="desc">Mayor precio</option>
        </select>
        <span className="text-xs text-gray-400">{totalResults} resultados</span>
      </div>
    </div>
  )
}
