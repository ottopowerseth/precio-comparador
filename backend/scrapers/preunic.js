import { newPage } from '../browser.js'
// MEJORA: no normaliza query antes de buscar
// NOTA: browser compartido puede tardar en arrancar en frío — timeouts aumentados
function normalizeQuery(q) {
  return q
    .replace(/\bdesodorantes\b/gi, 'desodorante')
    .replace(/\btinturas\b/gi, 'tintura')
    .replace(/\bjabones\b/gi, 'jabon')
    .replace(/\bshampoos\b/gi, 'shampoo')
    .trim()
}

export async function scrapePreunic(query) {
  const STORE = 'PREUNIC'
  query = normalizeQuery(query)
  const page = await newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
  })

  try {
    await page.goto(`https://preunic.cl/products?query=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    })

    // Espera breve para que Algolia inicie la carga del widget antes de esperar el selector
    await page.waitForTimeout(1500)

    const hasResults = await page.waitForSelector('.ais-Hits-item', { timeout: 22000 }).then(() => true).catch(() => false)

    if (!hasResults) {
      console.warn(`[${STORE}] [WARN] 0 resultados - selector .ais-Hits-item no encontró elementos para query="${query}"`)
      return []
    }

    const items = await page.evaluate(() => {
      const items = document.querySelectorAll('.ais-Hits-item')
      return Array.from(items).slice(0, 25).map(el => {
        const lines = el.innerText.split('\n').map(l => l.trim()).filter(Boolean)
        // BUG POTENCIAL: nombres < 10 chars se descartan silenciosamente
        const name = lines.find(l => l.length > 10 && !l.startsWith('$') && !l.startsWith('-') && !/^\d+$/.test(l)) || ''
        const purePrices = lines.filter(l => /^\$[\d.]+$/.test(l))
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

    console.log(`[${STORE}] [OK] ${items.length} productos para query="${query}"`)
    return items
  } catch (e) {
    console.error(`[${STORE}] [ERROR] ${e.message} para query="${query}"`)
    return []
  } finally {
    await page.close()
  }
}
