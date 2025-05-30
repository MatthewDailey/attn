import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Browser, Page, type Cookie } from 'puppeteer'
import fs from 'fs'
import path from 'path'

// Use stealth plugin
puppeteer.use(StealthPlugin())

export interface SocialPages {
  withLinkedin: (callback: (page: Page) => Promise<void> | void) => Promise<void>
  withTwitter: (callback: (page: Page) => Promise<void> | void) => Promise<void>
}

export class SocialAuth {
  private linkedinCookiesPath: string
  private twitterCookiesPath: string

  constructor(
    linkedinCookiesPath: string = path.join(process.cwd(), 'linkedin-cookies.json'),
    twitterCookiesPath: string = path.join(process.cwd(), 'twitter-cookies.json'),
  ) {
    this.linkedinCookiesPath = linkedinCookiesPath
    this.twitterCookiesPath = twitterCookiesPath
  }

  /**
   * Opens a headed browser with both LinkedIn and Twitter tabs for simultaneous login
   * Saves cookies when the user has logged into both platforms
   */
  async login(): Promise<void> {
    let needsLinkedinLogin = !fs.existsSync(this.linkedinCookiesPath)
    let needsTwitterLogin = !fs.existsSync(this.twitterCookiesPath)

    if (!needsLinkedinLogin && !needsTwitterLogin) {
      console.log('\x1b[32m%s\x1b[0m', '✔︎ Already logged in to both platforms')
      return
    }

    console.log(
      '\x1b[33m%s\x1b[0m',
      'A browser will open with both LinkedIn and Twitter tabs. Please sign in to both platforms.',
    )
    console.log('\x1b[33m%s\x1b[0m', 'Press [Enter] to continue...')
    await new Promise((resolve) => process.stdin.once('data', resolve))

    // Launch a headed browser
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized'],
    })

    try {
      // Create pages for both platforms
      const linkedinPage = await browser.newPage()
      const twitterPage = await browser.newPage()

      // Load existing cookies if they exist
      if (fs.existsSync(this.linkedinCookiesPath)) {
        try {
          const cookiesStr = fs.readFileSync(this.linkedinCookiesPath, 'utf8')
          const cookiesArr = JSON.parse(cookiesStr)
          await linkedinPage.setCookie(...cookiesArr)
        } catch (err) {
          console.warn('Error loading LinkedIn cookies:', err)
        }
      }

      if (fs.existsSync(this.twitterCookiesPath)) {
        try {
          const cookiesStr = fs.readFileSync(this.twitterCookiesPath, 'utf8')
          const cookiesArr = JSON.parse(cookiesStr)
          await twitterPage.setCookie(...cookiesArr)
        } catch (err) {
          console.warn('Error loading Twitter cookies:', err)
        }
      }

      // Navigate to both platforms simultaneously
      await Promise.all([
        linkedinPage.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' }),
        twitterPage.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle2' }),
      ])

      console.log(
        '\x1b[36m%s\x1b[0m',
        'Both tabs are now open. Please complete login on both platforms.',
      )

      // Set up cookie saving intervals for both platforms
      let linkedinCookies: Cookie[] = []
      let twitterCookies: Cookie[] = []

      const linkedinInterval = setInterval(async () => {
        try {
          linkedinCookies = await linkedinPage.cookies()
          if (linkedinCookies.length > 0) {
            fs.writeFileSync(this.linkedinCookiesPath, JSON.stringify(linkedinCookies, null, 2))
          }
        } catch (err) {
          // Page might be closed or navigated away
        }
      }, 5000)

      const twitterInterval = setInterval(async () => {
        try {
          twitterCookies = await twitterPage.cookies()
          if (twitterCookies.length > 0) {
            fs.writeFileSync(this.twitterCookiesPath, JSON.stringify(twitterCookies, null, 2))
          }
        } catch (err) {
          // Page might be closed or navigated away
        }
      }, 5000)

      // Check login status periodically and provide feedback
      const statusInterval = setInterval(async () => {
        try {
          const linkedinLoggedIn = await linkedinPage
            .evaluate(
              () =>
                window.location.href.includes('https://www.linkedin.com/feed/') ||
                window.location.href.includes('https://www.linkedin.com/in/') ||
                window.location.href.includes('https://www.linkedin.com/mynetwork/') ||
                window.location.href.includes('https://www.linkedin.com/jobs/'),
            )
            .catch(() => false)

          const twitterLoggedIn = await twitterPage
            .evaluate(
              () =>
                window.location.href.includes('https://twitter.com/home') ||
                window.location.href.includes('https://x.com/home') ||
                window.location.href.includes('https://twitter.com/i/timeline') ||
                window.location.href.includes('https://x.com/i/timeline'),
            )
            .catch(() => false)

          if (linkedinLoggedIn && !needsLinkedinLogin) {
            // Already was logged in
          } else if (linkedinLoggedIn && needsLinkedinLogin) {
            console.log('\x1b[32m%s\x1b[0m', '✔︎ Successfully logged in to LinkedIn')
            needsLinkedinLogin = false
          }

          if (twitterLoggedIn && !needsTwitterLogin) {
            // Already was logged in
          } else if (twitterLoggedIn && needsTwitterLogin) {
            console.log('\x1b[32m%s\x1b[0m', '✔︎ Successfully logged in to Twitter')
            needsTwitterLogin = false
          }

          // If both are complete, notify user
          if (!needsLinkedinLogin && !needsTwitterLogin) {
            console.log('\x1b[32m%s\x1b[0m', '✔︎ Both platforms are now logged in!')
            console.log('\x1b[33m%s\x1b[0m', 'Press [Enter] to close the browser and continue...')
            clearInterval(statusInterval)
          }
        } catch (err) {
          // Pages might be closed
        }
      }, 3000)

      // Wait for user to indicate they're done
      await new Promise((resolve) => process.stdin.once('data', resolve))

      // Clean up intervals and close browser
      clearInterval(linkedinInterval)
      clearInterval(twitterInterval)
      clearInterval(statusInterval)
      await browser.close()

      console.log('\x1b[32m%s\x1b[0m', '✔︎ Login process completed')
    } catch (error: any) {
      if (!error?.message?.includes('Navigating frame was detached')) {
        console.error('Error during login:', error)
      }
    }
  }

  /**
   * Starts a browser and opens both Twitter and LinkedIn home pages
   * Returns an object with methods to interact with each platform
   */
  async startBrowser(): Promise<SocialPages> {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized'],
    })

    // Create pages for both platforms
    const linkedinPage = await browser.newPage()
    const twitterPage = await browser.newPage()

    // Load LinkedIn cookies and navigate
    if (fs.existsSync(this.linkedinCookiesPath)) {
      try {
        const cookiesStr = fs.readFileSync(this.linkedinCookiesPath, 'utf8')
        const cookiesArr = JSON.parse(cookiesStr)
        await linkedinPage.setCookie(...cookiesArr)
      } catch (err) {
        console.warn('Error loading LinkedIn cookies:', err)
      }
    }

    // Load Twitter cookies and navigate
    if (fs.existsSync(this.twitterCookiesPath)) {
      try {
        const cookiesStr = fs.readFileSync(this.twitterCookiesPath, 'utf8')
        const cookiesArr = JSON.parse(cookiesStr)
        await twitterPage.setCookie(...cookiesArr)
      } catch (err) {
        console.warn('Error loading Twitter cookies:', err)
      }
    }

    // Navigate to both platforms
    await Promise.all([
      linkedinPage.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2' }),
      twitterPage.goto('https://twitter.com/home', { waitUntil: 'networkidle2' }),
    ])

    console.log('\x1b[32m%s\x1b[0m', '✔︎ Browser started with both LinkedIn and Twitter pages')

    return {
      withLinkedin: async (callback: (page: Page) => Promise<void> | void) => {
        await callback(linkedinPage)
      },
      withTwitter: async (callback: (page: Page) => Promise<void> | void) => {
        await callback(twitterPage)
      },
    }
  }

  /**
   * Check if cookies exist for both platforms
   */
  isLoggedIn(): { linkedin: boolean; twitter: boolean } {
    return {
      linkedin: fs.existsSync(this.linkedinCookiesPath),
      twitter: fs.existsSync(this.twitterCookiesPath),
    }
  }

  /**
   * Clear saved cookies for both platforms
   */
  logout(): void {
    if (fs.existsSync(this.linkedinCookiesPath)) {
      fs.unlinkSync(this.linkedinCookiesPath)
      console.log('LinkedIn cookies cleared')
    }
    if (fs.existsSync(this.twitterCookiesPath)) {
      fs.unlinkSync(this.twitterCookiesPath)
      console.log('Twitter cookies cleared')
    }
  }
}
