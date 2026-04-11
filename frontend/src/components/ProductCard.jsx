const STORE_COLORS = {
  'La Mundial':   'bg-red-100 text-red-700',
  'Liquimax':     'bg-yellow-100 text-yellow-700',
  'Preunic':      'bg-purple-100 text-purple-700',
  'Maicao':       'bg-orange-100 text-orange-700',
  'Espol':        'bg-blue-100 text-blue-700',
  'Trimaico':     'bg-teal-100 text-teal-700',
  'MercadoLibre': 'bg-yellow-200 text-yellow-800',
}

function HistoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

export default function ProductCard({ product, isBest, onHistory }) {
  return (
    <div className={`bg-white rounded-xl border p-4 flex gap-4 items-start shadow-sm relative transition hover:shadow-md
      ${isBest ? 'border-green-400 ring-1 ring-green-300' : 'border-gray-200'}`}>

      {/* Badge mejor precio */}
      {isBest && (
        <div className="absolute -top-3 left-4 flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.456A1 1 0 0112 2z" clipRule="evenodd" />
          </svg>
          Mejor precio
        </div>
      )}

      {/* Imagen */}
      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.productName}
            className="w-full h-full object-contain"
            onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sin imagen</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STORE_COLORS[product.store] || 'bg-gray-100 text-gray-600'}`}>
          {product.store}
        </span>
        <p className="mt-1 text-sm text-gray-800 font-medium line-clamp-2">{product.productName}</p>
        <p className={`text-xl font-bold mt-1 ${isBest ? 'text-green-600' : 'text-blue-800'}`}>
          {product.priceFormatted}
        </p>
      </div>

      {/* Botones */}
      <div className="flex flex-col gap-2 flex-shrink-0 self-center">
        <a href={product.productUrl} target="_blank" rel="noopener noreferrer"
          className="bg-blue-800 text-white text-xs px-3 py-2 rounded-lg hover:bg-blue-700 transition text-center">
          Ver oferta
        </a>
        <button onClick={() => onHistory(product)}
          className="flex items-center justify-center gap-1 border border-gray-300 text-gray-600 text-xs px-3 py-2 rounded-lg hover:bg-gray-50 hover:border-blue-400 hover:text-blue-700 transition">
          <HistoryIcon />
          Historial
        </button>
      </div>
    </div>
  )
}
