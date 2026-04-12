import ProductCard from './ProductCard.jsx'

function Skeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
      <div className="flex gap-3 mb-3">
        <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-100 rounded-lg" />
      </div>
    </div>
  )
}

export default function ResultsTable({ groups, loading, searched, query, onHistory }) {
  if (loading && (!groups || groups.length === 0)) {
    return (
      <div className="mt-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    )
  }

  if (!searched) return null

  if ((!groups || groups.length === 0) && !loading) {
    return (
      <div className="mt-10 text-center text-gray-500">
        No se encontraron resultados para <strong>"{query}"</strong>.
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-4">
      {groups.map(group => (
        <ProductCard key={group.key} group={group} onHistory={onHistory} />
      ))}
      {loading && <Skeleton />}
    </div>
  )
}
