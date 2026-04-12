import { chromium } from 'playwright'

let browser = null
let launching = null

async function launchBrowser() {
  const b = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
    ],
  })
  b.on('disconnected', () => {
    console.log('[browser] disconnected, will relaunch on next request')
    browser = null
    launching = null
  })
  return b
}

export async function getBrowser() {
  // Si está caído, limpiar estado
  if (browser && !browser.isConnected()) {
    browser = null
    launching = null
  }
  if (browser?.isConnected()) return browser
  if (!launching) {
    launching = launchBrowser().then(b => {
      browser = b
      launching = null
      return b
    }).catch(err => {
      launching = null
      throw err
    })
  }
  return launching
}

// Obtiene una nueva página, reintentando con browser nuevo si el actual está caído
export async function newPage() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const b = await getBrowser()
      return await b.newPage()
    } catch (err) {
      if (attempt === 0 && (err.message.includes('closed') || err.message.includes('disconnected'))) {
        // Forzar relanzamiento del browser y reintentar
        browser = null
        launching = null
        console.log('[browser] forcing relaunch after error:', err.message)
        continue
      }
      throw err
    }
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}
