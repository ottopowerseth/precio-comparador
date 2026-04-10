import { chromium } from 'playwright'

export async function scrapeMercadoLibre(query) {
  // Browser propio para no competir con el shared browser de los otros scrapers
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
  })

  try {
    const slug = query.trim().replace(/\s+/g, '-')
    await page.goto(`https://listado.mercadolibre.cl/${slug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })
    await page.waitForSelector('.ui-search-layout__item', { timeout: 15000 })

    return await page.evaluate(() => {
      const items = document.querySelectorAll('.ui-search-layout__item')
      return Array.from(items).slice(0, 10).map(el => {
        const name = el.querySelector('[class*="title"]')?.innerText?.trim() || ''
        const fraction = el.querySelector('.andes-money-amount__fraction')?.innerText?.trim() || '0'
        const price = parseInt(fraction.replace(/\./g, '')) || 0
        const imageUrl = el.querySelector('img')?.src || ''
        const link = el.querySelector('a')?.href || ''
        return {
          store: 'MercadoLibre', storeLogo: 'mercadolibre',
          productName: name, price,
          priceFormatted: `$${price.toLocaleString('es-CL')}`,
          imageUrl, productUrl: link, available: true,
        }
      }).filter(p => p.productName && p.price > 0)
    })
  } finally {
    await browser.close()
  }
}
