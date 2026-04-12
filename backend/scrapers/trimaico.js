import { newPage } from '../browser.js'

export async function scrapeTrimaico(query) {
  
  const page = await newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
  })

  try {
    await page.goto(`https://trimaico.cl/?s=${encodeURIComponent(query)}&post_type=product`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })

    // Si hay un solo resultado redirige a la página del producto
    const currentUrl = page.url()
    if (currentUrl.includes('/product/')) {
      const result = await page.evaluate(() => {
        const name = document.querySelector('h1.product_title, .product_title')?.innerText?.trim() || ''
        const priceText = document.querySelector('.price .woocommerce-Price-amount, .woocommerce-Price-amount')?.innerText?.trim() || ''
        const match = priceText.match(/\$([\d.]+)/)
        const price = match ? parseInt(match[1].replace(/\./g, '')) : 0
        const imageUrl = document.querySelector('.woocommerce-product-gallery img')?.src || ''
        return [{ name, price, imageUrl, link: location.href }]
      })
      return result
        .filter(p => p.name && p.price > 0 && p.price < 500000)
        .map(p => ({
          store: 'Trimaico', storeLogo: 'trimaico',
          productName: p.name, price: p.price,
          priceFormatted: `$${p.price.toLocaleString('es-CL')}`,
          imageUrl: p.imageUrl, productUrl: p.link, available: true,
        }))
    }

    const hasResults = await page.waitForSelector('.product-grid-item', { timeout: 10000 }).then(() => true).catch(() => false)
    if (!hasResults) return []

    return await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.product-grid-item')).slice(0, 25).map(el => {
        const name = el.querySelector('.wd-entities-title, .product-title, h3, h2')?.innerText?.trim() || ''
        const priceText = el.querySelector('.price, .woocommerce-Price-amount, .amount')?.innerText?.trim() || ''
        // Tomar el último precio (precio con descuento si hay precio tachado)
        const allMatches = [...priceText.matchAll(/\$([\d]{1,3}(?:\.[\d]{3})*)/g)]
        const lastMatch = allMatches[allMatches.length - 1]
        const price = lastMatch ? parseInt(lastMatch[1].replace(/\./g, '')) : 0
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
  } finally {
    await page.close()
  }
}
