import { newPage } from '../browser.js'

export async function scrapeMaicao(query) {
  
  const page = await newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
  })

  try {
    // Ir directo a la URL de búsqueda
    await page.goto(`https://www.maicao.cl/busqueda?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })

    // Cerrar modal de ubicación si aparece
    await page.locator('button:has-text("MANTENER")').click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Intentar encontrar productos (Maicao usa JS pesado, no siempre carga en headless)
    const hasProducts = await page.waitForSelector(
      '[class*="product-tile"], [class*="product-item"], [class*="item-template"]',
      { timeout: 8000 }
    ).then(() => true).catch(() => false)

    if (!hasProducts) return []

    return await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="product-tile"], [class*="product-item"], [class*="item-template"]')
      return Array.from(items).slice(0, 25).map(el => {
        const name = el.querySelector('[class*="name"], [class*="title"], h3, h2')?.innerText?.trim() || ''
        const priceText = el.querySelector('[class*="price"]')?.innerText?.trim() || '0'
        const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0
        const imageUrl = el.querySelector('img')?.src || ''
        const link = el.querySelector('a')?.href || ''
        return {
          store: 'Maicao', storeLogo: 'maicao',
          productName: name, price,
          priceFormatted: `$${price.toLocaleString('es-CL')}`,
          imageUrl, productUrl: link, available: true,
        }
      }).filter(p => p.productName && p.price > 0)
    })
  } finally {
    await page.close()
  }
}
