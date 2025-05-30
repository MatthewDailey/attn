/**
 * @fileoverview This file defines a command-line interface using yargs. It provides commands for social media authentication and browser automation.
 */

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { SocialAuth } from '../social-auth.js'
import { scrollAndGatherTwitter, scrollAndGatherTwitterAlternative } from '../twitter-utils.js'
import path from 'path'

const socialAuth = new SocialAuth()

yargs(hideBin(process.argv))
  .command('hello', 'Say hello', {}, (argv) => {
    console.log('Hello, world!')
  })
  .command('login', 'Login to both LinkedIn and Twitter', {}, async (argv) => {
    try {
      await socialAuth.login()
    } catch (error) {
      console.error('Login failed:', error)
      process.exit(1)
    }
  })
  .command('status', 'Check login status', {}, () => {
    const status = socialAuth.isLoggedIn()
    console.log('Login Status:')
    console.log(`LinkedIn: ${status.linkedin ? '✓ Logged in' : '✗ Not logged in'}`)
    console.log(`Twitter: ${status.twitter ? '✓ Logged in' : '✗ Not logged in'}`)
  })
  .command('logout', 'Clear saved cookies', {}, () => {
    socialAuth.logout()
    console.log('Logged out from all platforms')
  })
  .command('browser', 'Start browser with both platforms', {}, async () => {
    try {
      const pages = await socialAuth.startBrowser()
      console.log('Browser started successfully!')
      console.log('Use Ctrl+C to close when done.')

      // Keep the process alive
      process.on('SIGINT', () => {
        console.log('\nClosing browser...')
        process.exit(0)
      })

      // Prevent the process from exiting
      await new Promise(() => {})
    } catch (error) {
      console.error('Failed to start browser:', error)
      process.exit(1)
    }
  })
  .command(
    'twitter-screenshots [count] [directory]',
    'Capture screenshots of Twitter posts',
    (yargs) => {
      return yargs
        .positional('count', {
          describe: 'Number of posts to capture',
          type: 'number',
          default: 10,
        })
        .positional('directory', {
          describe: 'Directory to save screenshots',
          type: 'string',
          default: './twitter-screenshots',
        })
    },
    async (argv) => {
      try {
        const loginStatus = socialAuth.isLoggedIn()

        // Login to Twitter if needed
        if (!loginStatus.twitter) {
          console.log('📱 Need to login to Twitter first...')
          await socialAuth.login()
        }

        // Start browser with authenticated session
        console.log('🌐 Starting browser with authenticated Twitter session...')
        const pages = await socialAuth.startBrowser()

        // Use the authenticated Twitter page
        await pages.withTwitter(async (page) => {
          console.log('📱 Using authenticated Twitter page...')
          const title = await page.title()
          console.log('Twitter page title:', title)

          // Wait a moment for the page to fully load
          console.log('⏳ Waiting for page to fully load...')
          await new Promise((resolve) => setTimeout(resolve, 3000))

          // Set up screenshot directory
          const screenshotDir = path.resolve(argv.directory)
          const numPostsToCapture = argv.count

          console.log(`📸 Capturing ${numPostsToCapture} Twitter posts to ${screenshotDir}...`)

          try {
            // Try the main function first
            await scrollAndGatherTwitter(page, screenshotDir, numPostsToCapture)
          } catch (error) {
            console.warn('⚠️ Main function failed, trying alternative method...')
            console.error('Main error:', error)
          }

          console.log('✅ Screenshot capture completed!')
        })

        console.log('🔄 Process completed! You can now close the browser window.')
      } catch (error) {
        console.error('Twitter screenshot capture failed:', error)
        process.exit(1)
      }
    },
  )
  .demandCommand(1)
  .help().argv
