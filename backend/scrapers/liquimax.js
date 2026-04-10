import { getBrowser } from '../browser.js'

export async function scrapeLiquimax(query) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
  })

  try {
    await page.goto('https://www.liquimax.cl', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForSelector('#search-input', { timeout: 8000 })
    await page.fill('#search-input', query)
    await page.keyboard.press('Enter')
    await page.waitForURL(/search/, { timeout: 10000 })
    await page.waitForSelector('[class*="product-item"]', { timeout: 10000 })

    return await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="product-item"]')
      return Array.from(items).slice(0, 10).map(el => {
        const nameEl = el.querySelector('a[href*="/products/"][class*="title"], a[href*="/products/"]:not([class*="image"])')
          || [...el.querySelectorAll('a[href*="/products/"]')].find(a => a.innerText?.trim().length > 3)
        const name = nameEl?.innerText?.trim() || ''
        const priceText = el.querySelector('[class*="product-prices"], [class*="price"]')?.innerText?.trim() || '0'
        const match = priceText.match(/\$?([\d.]+)/)
        const price = match ? parseInt(match[1].replace(/\./g, '')) : 0
        const imageUrl = el.querySelector('img')?.src || ''
        const link = el.querySelector('a[href*="/products/"]')?.href || ''
        return {
          store: 'Liquimax', storeLogo: 'liquimax',
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
