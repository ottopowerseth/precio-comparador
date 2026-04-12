import { newPage } from '../browser.js'
// MEJORA: no normaliza query antes de buscar
// CRÍTICO: depende del browser compartido
export async function scrapeTrimaico(query) {
  const STORE = 'TRIMAICO'
  const page = await newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
  })

  try {
    await page.goto(`https://trimaico.cl/?s=${encodeURIComponent(query)}&post_type=product`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })

    // WooCommerce redirige a la página del producto cuando hay exactamente un resultado
    const currentUrl = page.url()
    if (currentUrl.includes('/product/')) {
      // Esperar a que cargue el título antes de extraer
      await page.waitForSelector('h1.product_title, h1.entry-title', { timeout: 8000 }).catch(() => {})

      // textContent es más fiable que innerText en headless (no depende de visibilidad CSS)
      const name = await page.evaluate(() =>
        document.querySelector('h1.product_title, h1.wd-entities-title, h1.entry-title')?.textContent?.trim() || ''
      )

      // BUG FIX: el selector compuesto ".price .wc-price, .wc-price" devuelve el PRIMER
      // match en el DOM (que puede ser el carrito con $0). Usamos SOLO ".price .woocommerce-Price-amount"
      // que es específico al bloque de precio del producto, no del carrito.
      const priceText = await page.evaluate(() =>
        document.querySelector('.price .woocommerce-Price-amount')?.textContent?.trim() || '0'
      )
      // Quitar TODO lo que no sea dígito → "$1.150" → "1150", "$ 1.150,00" → "115000"
      // Para precios CLP sin decimales, esto es correcto
      const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0

      const imageUrl = await page.evaluate(() =>
        document.querySelector('.woocommerce-product-gallery img')?.src || ''
      )

      if (!name || !price || price >= 500000) {
        console.warn(`[${STORE}] [WARN] Redirect a producto individual sin datos válidos para query="${query}" → name="${name}" price=${price}`)
        return []
      }

      const item = {
        store: 'Trimaico', storeLogo: 'trimaico',
        productName: name, price,
        priceFormatted: `$${price.toLocaleString('es-CL')}`,
        imageUrl, productUrl: currentUrl, available: true,
      }
      console.log(`[${STORE}] [OK] 1 producto (redirect individual) para query="${query}": ${name} → $${price}`)
      return [item]
    }

    const hasResults = await page.waitForSelector('.product-grid-item', { timeout: 10000 }).then(() => true).catch(() => false)
    if (!hasResults) {
      console.warn(`[${STORE}] [WARN] 0 resultados - selector .product-grid-item no encontró elementos para query="${query}"`)
      return []
    }

    const items = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.product-grid-item')).slice(0, 25).map(el => {
        const name = el.querySelector('.wd-entities-title, .product-title, h3, h2')?.textContent?.trim() || ''
        const priceText = el.querySelector('.price, .woocommerce-Price-amount, .amount')?.textContent?.trim() || ''
        // Tomar el último número de precio (con descuento si hay precio tachado)
        const allMatches = [...priceText.matchAll(/[\d]{1,3}(?:\.[\d]{3})*/g)]
        const lastMatch = allMatches[allMatches.length - 1]
        const price = lastMatch ? parseInt(lastMatch[0].replace(/\./g, '')) : 0
        const imageUrl = el.querySelector('img')?.src || ''
        const link = el.querySelector('a.product-image-link')?.href || ''
        const outOfStock = !!el.querySelector('.out-of-stock')
        return {
          store: 'Trimaico', storeLogo: 'trimaico',
          productName: name, price,
          priceFormatted: `$${price.toLocaleString('es-CL')}`,
          imageUrl, productUrl: link, available: !outOfStock,
        }
      }).filter(p => p.productName && p.price > 0 && p.price < 500000)
    })

    console.log(`[${STORE}] [OK] ${items.length} productos para query="${query}"`)
    return items
  } catch (e) {
    console.error(`[${STORE}] [ERROR] ${e.message} para query="${query}"`)
    return []
  } finally {
    await page.close()
  }
}
