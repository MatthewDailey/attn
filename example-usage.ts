import { SocialAuth } from './social-auth.js'

async function example() {
  const socialAuth = new SocialAuth()

  // Check if already logged in
  const loginStatus = socialAuth.isLoggedIn()
  console.log('Login status:', loginStatus)

  // Login to both platforms if needed (opens both tabs simultaneously)
  if (!loginStatus.linkedin || !loginStatus.twitter) {
    console.log('Need to login...')
    await socialAuth.login()
  }

  // Start browser with both platforms
  const pages = await socialAuth.startBrowser()

  // Use LinkedIn page
  await pages.withLinkedin(async (page) => {
    console.log('Working with LinkedIn page...')
    const title = await page.title()
    console.log('LinkedIn page title:', title)

    // Example: scroll down a bit
    await page.evaluate(() => {
      window.scrollBy(0, 500)
    })
  })

  // Use Twitter page
  await pages.withTwitter(async (page) => {
    console.log('Working with Twitter page...')
    const title = await page.title()
    console.log('Twitter page title:', title)

    // Example: wait for tweets to load
    await page.waitForSelector('[data-testid="tweet"]', { timeout: 5000 }).catch(() => {
      console.log('No tweets found or page structure changed')
    })
  })

  console.log('Example completed!')
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  example().catch(console.error)
}

export { example }
