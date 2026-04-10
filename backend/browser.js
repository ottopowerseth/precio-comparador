import { chromium } from 'playwright'

let browser = null
let launching = null

export async function getBrowser() {
  if (browser?.isConnected()) return browser
  if (!launching) {
    launching = chromium.launch({ headless: true }).then(b => {
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
