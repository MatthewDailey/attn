import { Page, ElementHandle } from 'puppeteer'
import fs from 'fs'
import path from 'path'

// Helper function for delays since waitForTimeout might not be available in all versions
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Bring a page to the front and ensure it's focused
 */
export async function focusBrowserTab(page: Page, platformName: string): Promise<void> {
  try {
    console.log(`🎯 Focusing ${platformName} browser tab...`)

    // Bring the page to the front
    await page.bringToFront()

    await delay(1000)

    console.log(`✅ ${platformName} tab is now focused`)
  } catch (error) {
    console.warn(`⚠️ Could not focus ${platformName} tab: ${error}`)
    // Continue anyway - focusing is nice to have but not critical
  }
}
