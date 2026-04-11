import ProductCard from './ProductCard.jsx'

function Skeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 animate-pulse">
      <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-6 bg-gray-200 rounded w-1/3" />
      </div>
      <div className="flex flex-col gap-2 self-center">
        <div className="h-8 w-20 bg-gray-200 rounded-lg" />
        <div className="h-8 w-20 bg-gray-200 rounded-lg" />
      </div>
    </div>
  )
}

export default function ResultsTable({ results, loading, searched, query, onHistory }) {
  if (loading && results.length === 0) {
    return (
      <div className="mt-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    )
  }

  if (!searched) return null

  if (results.length === 0 && !loading) {
    return (
      <div className="mt-10 text-center text-gray-500">
        No se encontraron resultados para <strong>"{query}"</strong>.
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-4">
      {results.map((product, i) => (
        <ProductCard
          key={`${product.store}-${product.productName}-${i}`}
          product={product}
          isBest={i === 0}
          onHistory={onHistory}
        />
      ))}
      {loading && <Skeleton />}
    </div>
  )
}
