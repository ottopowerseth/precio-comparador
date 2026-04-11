import { useEffect, useState } from 'react'

function PriceChart({ entries }) {
  if (!entries || entries.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Se necesitan al menos 2 registros para mostrar el gráfico
      </div>
    )
  }

  const W = 560, H = 200, PAD = { top: 20, right: 20, bottom: 40, left: 70 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top  - PAD.bottom

  const prices = entries.map(e => e.price)
  const minP   = Math.min(...prices)
  const maxP   = Math.max(...prices)
  const rangeP = maxP - minP || 1

  const toX = i => PAD.left + (i / (entries.length - 1)) * innerW
  const toY = p => PAD.top  + innerH - ((p - minP) / rangeP) * innerH

  const points    = entries.map((e, i) => [toX(i), toY(e.price)])
  const polyline  = points.map(([x, y]) => `${x},${y}`).join(' ')

  // Área rellena bajo la línea
  const area = [
    `M ${points[0][0]},${PAD.top + innerH}`,
    ...points.map(([x, y]) => `L ${x},${y}`),
    `L ${points[points.length - 1][0]},${PAD.top + innerH}`,
    'Z',
  ].join(' ')

  // Etiquetas del eje X (máx 6)
  const xLabels = entries.reduce((acc, e, i) => {
    if (entries.length <= 6 || i % Math.ceil(entries.length / 5) === 0 || i === entries.length - 1) {
      acc.push({ x: toX(i), label: e.date.slice(5) }) // MM-DD
    }
    return acc
  }, [])

  // Etiquetas del eje Y
  const ySteps  = 4
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const price = minP + (rangeP * i) / ySteps
    return { y: toY(price), label: `$${Math.round(price).toLocaleString('es-CL')}` }
  })

  const minIdx  = prices.indexOf(Math.min(...prices))
  const maxIdx  = prices.indexOf(Math.max(...prices))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2563eb" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Área */}
      <path d={area} fill="url(#areaGrad)" />

      {/* Línea de referencia mínimo */}
      <line x1={PAD.left} x2={PAD.left + innerW}
        y1={toY(minP)} y2={toY(minP)}
        stroke="#22c55e" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />

      {/* Línea principal */}
      <polyline points={polyline} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Puntos */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="white" stroke="#2563eb" strokeWidth="2" />
      ))}

      {/* Punto mínimo (verde) */}
      <circle cx={points[minIdx][0]} cy={points[minIdx][1]} r="5" fill="#22c55e" />
      <text x={points[minIdx][0]} y={points[minIdx][1] - 10}
        textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="bold">
        mín
      </text>

      {/* Punto máximo (rojo) */}
      <circle cx={points[maxIdx][0]} cy={points[maxIdx][1]} r="5" fill="#ef4444" />
      <text x={points[maxIdx][0]} y={points[maxIdx][1] - 10}
        textAnchor="middle" fontSize="10" fill="#dc2626" fontWeight="bold">
        máx
      </text>

      {/* Eje Y */}
      {yLabels.map(({ y, label }, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={PAD.left + innerW} y1={y} y2={y}
            stroke="#e5e7eb" strokeWidth="1" />
          <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
            {label}
          </text>
        </g>
      ))}

      {/* Eje X */}
      {xLabels.map(({ x, label }, i) => (
        <text key={i} x={x} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b7280">
          {label}
        </text>
      ))}
    </svg>
  )
}

export default function PriceHistoryModal({ product, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/history?product=${encodeURIComponent(product.productName)}&store=${encodeURIComponent(product.store)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setData({ entries: [] }); setLoading(false) })
  }, [product])

  const entries = data?.entries || []
  const minPrice = entries.length ? Math.min(...entries.map(e => e.price)) : null
  const maxPrice = entries.length ? Math.max(...entries.map(e => e.price)) : null
  const latest   = entries[entries.length - 1]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-4">
            <span className="text-xs font-semibold text-blue-600 uppercase">{product.store}</span>
            <h3 className="text-base font-bold text-gray-800 mt-0.5 line-clamp-2">{product.productName}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Cargando historial...</div>
        ) : (
          <>
            {/* Estadísticas */}
            {entries.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Precio actual</p>
                  <p className="text-lg font-bold text-blue-700">${latest?.price.toLocaleString('es-CL')}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Mínimo histórico</p>
                  <p className="text-lg font-bold text-green-600">${minPrice?.toLocaleString('es-CL')}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Máximo histórico</p>
                  <p className="text-lg font-bold text-red-500">${maxPrice?.toLocaleString('es-CL')}</p>
                </div>
              </div>
            )}

            {/* Gráfico */}
            <div className="bg-gray-50 rounded-xl p-3">
              <PriceChart entries={entries} />
            </div>

            {entries.length > 0 && (
              <p className="text-xs text-gray-400 text-center mt-3">
                {entries.length} registro{entries.length > 1 ? 's' : ''} — desde {entries[0].date} hasta {entries[entries.length - 1].date}
              </p>
            )}

            {entries.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Aún no hay historial para este producto. El precio se registra automáticamente en cada búsqueda.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
