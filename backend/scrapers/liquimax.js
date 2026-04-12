import { getBrowser } from '../browser.js'

export async function scrapeLiquimax(query) {
  
  const browser = await getBrowser()
  const page = await browser.newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
  })

  try {
    // Ir directo a la URL de búsqueda (más rápido y confiable)
    await page.goto(`https://www.liquimax.cl/search?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })

    const hasResults = await page.waitForSelector('[class*="product-item"]', { timeout: 12000 })
      .then(() => true).catch(() => false)

    if (!hasResults) return []

    return await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="product-item"]')
      return Array.from(items).slice(0, 25).map(el => {
        // Nombre: primer enlace a /products/ con texto suficiente
        const links = Array.from(el.querySelectorAll('a'))
        const nameEl = links.find(a =>
          a.href?.includes('/products/') &&
          !a.className?.includes('image') &&
          a.innerText?.trim().length > 3
        )
        const name = nameEl?.innerText?.trim() || ''

        // Precio real: usar data-initial-value del span .bootic-price (evita precios x 100ml)
        const priceRaw = el.querySelector('.bootic-price')?.getAttribute('data-initial-value')
          || el.querySelector('.bootic-price')?.innerText?.trim()
          || '0'
        const priceMatch = priceRaw.match(/\$([\d]{1,3}(?:\.[\d]{3})*)/)
        const price = priceMatch ? parseInt(priceMatch[1].replace(/\./g, '')) : 0

        const imageUrl  = el.querySelector('img')?.src || ''
        const link      = links.find(a => a.href?.includes('/products/'))?.href || ''

        return {
          store: 'Liquimax', storeLogo: 'liquimax',
          productName: name, price,
          priceFormatted: `$${price.toLocaleString('es-CL')}`,
          imageUrl, productUrl: link, available: true,
        }
      }).filter(p => p.productName && p.price > 0 && p.price < 500000)
    })
  } finally {
    await page.close()
  }
}
