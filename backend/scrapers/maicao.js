// Maicao → parsea datos JSON embebidos en data-gtm (sin browser)
// MEJORA: no normaliza query antes de buscar
export async function scrapeMaicao(query) {
  const STORE = 'MAICAO'
  try {
    const url = `https://www.maicao.cl/busqueda?q=${encodeURIComponent(query)}`
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
    // Extraer bloques product-tile que contienen el JSON de datos del producto
    // BUG POTENCIAL: si Maicao cambia el nombre de clase CSS esto se rompe
    const tileMarker = 'class="product-tile '
    const tiles = html.split(tileMarker)

    let parseErrors = 0
    for (let i = 1; i < tiles.length && results.length < 25; i++) {
      const tile = tiles[i].substring(0, 6000)

      // Extraer JSON del atributo data-gtm (puede contener &quot; como escape HTML)
      // BUG POTENCIAL: regex captura hasta el primer " real — si hay " sin escapar, se trunca
      const gtmMatch = tile.match(/data-gtm="(\{[^"]+\})"/)
      if (!gtmMatch) continue

      let gtmData
      try {
        const gtmStr = gtmMatch[1].replace(/&quot;/g, '"')
        gtmData = JSON.parse(gtmStr)
      } catch {
        parseErrors++
        continue
      }

      const imp = gtmData?.ecommerce?.impressions
      if (!imp) continue

      const productName = (imp.name || '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
        .replace(/&ordm;/g, 'º')
        .replace(/&[a-z]+;/g, '')
      if (!productName) continue

      // item_offer es el precio con descuento, price es el precio normal
      const price = imp.item_offer && imp.item_offer > 0 ? imp.item_offer : (imp.price || 0)
      if (!price || price >= 500000) continue

      const inStock = imp.item_stock !== false

      // URL del producto
      const linkMatch = tile.match(/href="(\/[^"]+\.html)"/)
      const productUrl = linkMatch ? `https://www.maicao.cl${linkMatch[1]}` : ''

      // Imagen
      const imgMatch = tile.match(/src="(https:\/\/www\.maicao\.cl\/dw\/image\/[^"]+)"/)
      const imageUrl = imgMatch ? imgMatch[1] : ''

      results.push({
        store: 'Maicao', storeLogo: 'maicao',
        productName, price,
        priceFormatted: `$${price.toLocaleString('es-CL')}`,
        imageUrl, productUrl, available: inStock,
      })
    }

    const final = results.filter(p => p.productName && p.price > 0)
    if (parseErrors > 0) {
      console.warn(`[${STORE}] [WARN] ${parseErrors} tiles con error de parseo JSON para query="${query}"`)
    }
    if (final.length === 0) {
      console.warn(`[${STORE}] [WARN] 0 resultados para query="${query}" (${tiles.length - 1} tiles procesados)`)
    } else {
      console.log(`[${STORE}] [OK] ${final.length} productos para query="${query}"`)
    }
    return final
  } catch (e) {
    console.error(`[${STORE}] [ERROR] ${e.message} para query="${query}"`)
    return []
  }
}
