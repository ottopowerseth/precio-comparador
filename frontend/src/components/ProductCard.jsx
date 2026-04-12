import { useState } from 'react'

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
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

const MAX_VISIBLE = 3

export default function ProductCard({ group, onHistory }) {
  const [expanded, setExpanded] = useState(false)
  const { nombre, imagen, tamaño, tamañoUnit, tiendas } = group

  const visibleTiendas = expanded ? tiendas : tiendas.slice(0, MAX_VISIBLE)
  const hiddenCount = tiendas.length - MAX_VISIBLE

  // Para el historial: usar la tienda con mejor precio
  function handleHistory() {
    onHistory({ productName: tiendas[0].productName, store: tiendas[0].nombre })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">

      {/* ── Cabecera: imagen + nombre ── */}
      <div className="flex gap-3 p-4 pb-3">
        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
          {imagen ? (
            <img src={imagen} alt={nombre}
              className="w-full h-full object-contain"
              onError={e => { e.target.style.display = 'none' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sin imagen</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">{nombre}</p>
          {tamaño && (
            <span className="inline-block mt-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {tamaño}
            </span>
          )}
        </div>
      </div>

      {/* ── Filas por tienda ── */}
      <div className="px-4 pb-2 space-y-1.5">
        {visibleTiendas.map(tienda => (
          <div
            key={tienda.nombre}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
              tienda.mejor_precio
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50'
            }`}
          >
            {/* Badge mejor precio */}
            {tienda.mejor_precio && (
              <span className="flex-shrink-0 text-xs font-bold text-green-700">
                ★ Mejor
              </span>
            )}

            {/* Nombre tienda */}
            <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${STORE_COLORS[tienda.nombre] || 'bg-gray-100 text-gray-600'}`}>
              {tienda.nombre}
            </span>

            {/* Precio */}
            <span className={`font-bold text-sm ${tienda.mejor_precio ? 'text-green-700' : 'text-brand'}`}>
              {tienda.priceFormatted}
            </span>

            {/* Precio por unidad */}
            {tienda.precio_por_unidad != null && (
              <span className="text-xs text-gray-400 flex-shrink-0">
                ${tienda.precio_por_unidad}/{tamañoUnit || 'ml'}
              </span>
            )}

            {/* Botón ver oferta */}
            <a
              href={tienda.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-brand text-brand hover:bg-brand hover:text-white transition"
            >
              Ver oferta →
            </a>
          </div>
        ))}
      </div>

      {/* ── Expandir si hay más de 3 tiendas ── */}
      {!expanded && hiddenCount > 0 && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-xs text-brand hover:text-brand-dark py-1.5 border border-dashed border-brand-border rounded-lg hover:bg-brand-light transition"
          >
            Ver {hiddenCount} tienda{hiddenCount !== 1 ? 's' : ''} más
          </button>
        </div>
      )}

      {/* ── Historial — uno por card ── */}
      <div className="px-4 py-2 border-t border-gray-100">
        <button
          onClick={handleHistory}
          title="Evolución del precio en los últimos 30 días"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand transition"
        >
          <HistoryIcon />
          Ver historial de precios
        </button>
      </div>
    </div>
  )
}
