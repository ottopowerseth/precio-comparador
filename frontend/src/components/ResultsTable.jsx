import ProductCard from './ProductCard.jsx'

function Skeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4 animate-pulse">
      <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-6 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  )
}

export default function ResultsTable({ results, loading, searched, query }) {
  if (loading) {
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    )
  }

  if (!searched) return null

  if (results.length === 0) {
    return (
      <div className="mt-10 text-center text-gray-500">
        No se encontraron resultados para <strong>"{query}"</strong>.
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-3">
      {results.map((product, i) => (
        <ProductCard key={`${product.store}-${i}`} product={product} isBest={i === 0} />
      ))}
    </div>
  )
}
