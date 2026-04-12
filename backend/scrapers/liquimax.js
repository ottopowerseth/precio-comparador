// Liquimax es Bootic → parseamos el HTML de búsqueda directamente (sin browser)
// MEJORA: no normaliza query antes de buscar
export async function scrapeLiquimax(query) {
  const STORE = 'LIQUIMAX'
  try {
    const url = `https://www.liquimax.cl/search?q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      console.warn(`[${STORE}] [WARN] HTTP ${res.status} para query="${query}"`)
      return []
    }
    const html = await res.text()

    const results = []
    // Iterar sobre cada enlace de producto (product-link product-image-link)
    const anchorMarker = 'class="product-link product-image-link"'
    const anchors = html.split(anchorMarker)

    for (let i = 1; i < anchors.length && results.length < 30; i++) {
      // El bloque empieza justo en el <a ... href="..." title="...">
      const segment = anchors[i].substring(0, 5000)

      // Título: atributo title en la etiqueta <a>
      // BUG: podría capturar un aria-label u otro title="" antes del título real
      const titleMatch = segment.match(/title="([^"]{5,})"/)
      const productName = titleMatch ? titleMatch[1].trim() : ''
      if (!productName) continue

      // URL del producto
      // BUG: requiere URL absoluta con https://www.liquimax.cl/ — links relativos se pierden
      const hrefMatch = segment.match(/href="(https:\/\/www\.liquimax\.cl\/[^"]+)"/)
      const productUrl = hrefMatch ? hrefMatch[1] : ''

      // Imagen: siguiente src de bolder.run en el segmento
      const imgMatch = segment.match(/src="(https:\/\/i\.bolder\.run\/[^"]+)"/)
      const imageUrl = imgMatch ? imgMatch[1] : ''

      // Precio: span precio-animado
      const priceMatch = segment.match(/precio-animado[^>]*>\$([0-9.,]+)/)
      if (!priceMatch) continue
      const priceRaw = priceMatch[1].replace(/\./g, '').replace(',', '.')
      const price = Math.round(parseFloat(priceRaw)) || 0

      if (!price || price >= 500000) continue

      results.push({
        store: 'Liquimax', storeLogo: 'liquimax',
        productName, price,
        priceFormatted: `$${price.toLocaleString('es-CL')}`,
        imageUrl, productUrl, available: true,
      })
    }

    const final = results.filter(p => p.productName && p.price > 0)
    if (final.length === 0) {
      console.warn(`[${STORE}] [WARN] 0 resultados para query="${query}" (${anchors.length - 1} anchors encontrados en HTML)`)
    } else {
      console.log(`[${STORE}] [OK] ${final.length} productos para query="${query}"`)
    }
    return final
  } catch (e) {
    console.error(`[${STORE}] [ERROR] ${e.message} para query="${query}"`)
    return []
  }
}
