import { newPage } from '../browser.js'
// BUG CRÍTICO: Espol usa precios placeholder $99,999 en el HTML → siempre 0 resultados
// Los precios reales se cargan dinámicamente vía JS (no disponible en SSR)
// SOLUCIÓN POSIBLE: usar fetch() directamente sin browser (HTML llega con SSR)
//   pero los precios siguen siendo $99,999 → esta tienda es inutilizable con el enfoque actual
// MEJORA: no normaliza query antes de buscar
export async function scrapeEspol(query) {
  const STORE = 'ESPOL'
  const page = await newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
  })

  try {
    await page.goto(`https://www.espol.cl/?s=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })
    const hasResults = await page.waitForSelector('.search-item', { timeout: 8000 }).then(() => true).catch(() => false)
    if (!hasResults) {
      console.warn(`[${STORE}] [WARN] 0 resultados - selector .search-item no encontró elementos para query="${query}"`)
      return []
    }

    const items = await page.evaluate(() => {
      const items = document.querySelectorAll('.search-item')
      return Array.from(items).slice(0, 25).map(el => {
        const name = el.querySelector('.post-title h4, .post-title, h4, h3, h2')?.innerText?.trim() || ''
        const priceText = el.querySelector('.woocommerce-Price-amount, .post-product-price')?.innerText?.trim() || '0'
        // BUG CRÍTICO: este precio es siempre "$99,999.00" (placeholder) → filtrado por p.price !== 99999
        const price = parseInt(priceText.replace(/[$,\s]/g, '').split('.')[0]) || 0
        const imageUrl = el.querySelector('img')?.src || ''
        const link = el.querySelector('a[href*="/producto/"]')?.href || el.querySelector('a')?.href || ''
        return {
          store: 'Espol', storeLogo: 'espol',
          productName: name, price,
          priceFormatted: `$${price.toLocaleString('es-CL')}`,
          imageUrl, productUrl: link, available: true,
        }
      }).filter(p => p.productName && p.price > 0 && p.price !== 99999)
    })

    if (items.length === 0) {
      console.warn(`[${STORE}] [WARN] 0 resultados útiles para query="${query}" - todos los precios son placeholder $99,999`)
    } else {
      console.log(`[${STORE}] [OK] ${items.length} productos para query="${query}"`)
    }
    return items
  } catch (e) {
    console.error(`[${STORE}] [ERROR] ${e.message} para query="${query}"`)
    return []
  } finally {
    await page.close()
  }
}
