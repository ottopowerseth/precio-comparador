// La Mundial es Shopify → usamos /search/suggest.json (sin browser)
// MEJORA: no normaliza query antes de buscar
export async function scrapeLaMundial(query) {
  const STORE = 'LAMUNDIAL'
  try {
    // Shopify predictive search endpoint (devuelve JSON con precio directo en el producto)
    // NOTA: brackets [type] y [limit] no están URL-encoded pero Shopify los acepta
    const url = `https://perfumerialamundial.cl/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=30`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      console.warn(`[${STORE}] [WARN] HTTP ${res.status} para query="${query}"`)
      return []
    }
    const data = await res.json()
    const products = data.resources?.results?.products || []

    if (products.length === 0) {
      console.warn(`[${STORE}] [WARN] 0 resultados para query="${query}"`)
      return []
    }

    const results = products.slice(0, 30).map(p => {
      // En este endpoint el precio viene directo en p.price (string, sin decimales)
      const price = p.price ? Math.round(parseFloat(p.price)) : 0
      const imageUrl = p.featured_image?.url || p.image || ''
      const productUrl = `https://perfumerialamundial.cl${p.url || '/products/' + p.handle}`
      return {
        store: 'La Mundial', storeLogo: 'lamundial',
        productName: p.title || '',
        price,
        priceFormatted: `$${price.toLocaleString('es-CL')}`,
        imageUrl, productUrl, available: p.available !== false,
      }
    }).filter(p => p.productName && p.price > 0 && p.price < 500000)

    console.log(`[${STORE}] [OK] ${results.length} productos para query="${query}"`)
    return results
  } catch (e) {
    console.error(`[${STORE}] [ERROR] ${e.message} para query="${query}"`)
    return []
  }
}
