const STORE_COLORS = {
  'La Mundial':    'bg-red-100 text-red-700',
  'Liquimax':      'bg-yellow-100 text-yellow-700',
  'Preunic':       'bg-purple-100 text-purple-700',
  'Maicao':        'bg-orange-100 text-orange-700',
  'Espol':         'bg-blue-100 text-blue-700',
  'MercadoLibre':  'bg-yellow-200 text-yellow-800',
}

export default function ProductCard({ product, isBest }) {
  return (
    <div className={`bg-white rounded-lg border p-4 flex gap-4 items-start shadow-sm relative ${isBest ? 'border-green-400' : 'border-gray-200'}`}>
      {isBest && (
        <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          Mejor precio
        </span>
      )}

      {/* Imagen */}
      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.productName}
            className="w-full h-full object-contain"
            onError={e => { e.target.style.display = 'none' }}
          />
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

      {/* Botón */}
      <a
        href={product.productUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 bg-blue-800 text-white text-xs px-3 py-2 rounded-lg hover:bg-blue-700 transition self-center"
      >
        Ver oferta
      </a>
    </div>
  )
}
