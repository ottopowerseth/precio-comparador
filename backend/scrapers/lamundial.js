import { newPage } from '../browser.js'

export async function scrapeLaMundial(query) {
  
  const page = await newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
  })

  try {
    await page.goto(`https://perfumerialamundial.cl/search?type=product&q=${encodeURIComponent(query)}*`, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    })
    await page.waitForSelector('.productgrid--item', { timeout: 12000 })

    return await page.evaluate(() => {
      const items = document.querySelectorAll('.productgrid--item')
      return Array.from(items).slice(0, 25).map(el => {
        const name = el.querySelector('.productitem--title, [class*="productitem__title"], [class*="title"] a')?.innerText?.trim() || ''
        const priceText = el.querySelector('.productitem__price, .price')?.innerText?.trim() || '0'
        // Tomar el ÚLTIMO precio (precio actual/con descuento cuando hay precio original)
        const allMatches = [...priceText.matchAll(/\$([\d]{1,3}(?:\.[\d]{3})*)/g)]
        const lastMatch = allMatches[allMatches.length - 1]
        const price = lastMatch ? parseInt(lastMatch[1].replace(/\./g, '')) : 0
        const imageUrl = el.querySelector('img')?.src || ''
        const link = el.querySelector('a[href*="/products/"]')?.href || ''
        return {
          store: 'La Mundial', storeLogo: 'lamundial',
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
