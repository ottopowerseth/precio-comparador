import { getBrowser } from '../browser.js'

export async function scrapePreunic(query) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
  })

  try {
    // Ir directo a la URL de búsqueda de Preunic (Algolia)
    await page.goto(`https://preunic.cl/products?query=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })
    await page.waitForSelector('.ais-Hits-item', { timeout: 12000 })

    return await page.evaluate(() => {
      const items = document.querySelectorAll('.ais-Hits-item')
      return Array.from(items).slice(0, 15).map(el => {
        const lines = el.innerText.split('\n').map(l => l.trim()).filter(Boolean)
        // Nombre: línea que no es precio ni porcentaje ni muy corta
        const name = lines.find(l => l.length > 10 && !l.startsWith('$') && !l.startsWith('-') && !/^\d+$/.test(l)) || ''
        // Precios puros: líneas con "$X.XXX" sin texto adicional (excluir precios por unidad)
        const purePrices = lines.filter(l => /^\$[\d.]+$/.test(l))
        // Si hay descuento hay 2 precios puros; el 2do es el precio oferta
        const priceText = purePrices[1] || purePrices[0] || '0'
        const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0
        const imageUrl = el.querySelector('img')?.src || ''
        const link = el.querySelector('a')?.href || ''
        return {
          store: 'Preunic', storeLogo: 'preunic',
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
