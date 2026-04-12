import { getBrowser } from '../browser.js'

export async function scrapeEspol(query) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
  })

  try {
    await page.goto(`https://www.espol.cl/?s=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })
    // Si no hay resultados, retornar vacío en vez de lanzar error
    const hasResults = await page.waitForSelector('.search-item', { timeout: 8000 }).then(() => true).catch(() => false)
    if (!hasResults) return []

    return await page.evaluate(() => {
      const items = document.querySelectorAll('.search-item')
      return Array.from(items).slice(0, 15).map(el => {
        const name = el.querySelector('.post-title h4, .post-title, h4, h3, h2')?.innerText?.trim() || ''
        const priceText = el.querySelector('.woocommerce-Price-amount, .post-product-price')?.innerText?.trim() || '0'
        // Precio en formato "$99,999.00" → convertir a int (quitar $, comas, decimales)
        const price = parseInt(priceText.replace(/[$,\s]/g, '').split('.')[0]) || 0
        const imageUrl = el.querySelector('img')?.src || ''
        const link = el.querySelector('a[href*="/producto/"]')?.href || el.querySelector('a')?.href || ''
        return {
          store: 'Espol', storeLogo: 'espol',
          productName: name, price,
          priceFormatted: `$${price.toLocaleString('es-CL')}`,
          imageUrl, productUrl: link, available: true,
        }
      // Filtrar precios placeholder ($99.999 = precio no configurado en Espol)
      }).filter(p => p.productName && p.price > 0 && p.price !== 99999)
    })
  } finally {
    await page.close()
  }
}
