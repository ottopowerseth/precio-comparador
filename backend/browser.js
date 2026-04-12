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
      '--single-process',
      '--no-zygote',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
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
    })
  }
  return launching
}

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}
