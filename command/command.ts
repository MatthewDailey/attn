/**
 * @fileoverview This file defines a command-line interface using yargs. It provides commands for social media authentication and browser automation.
 */

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { SocialAuth } from '../social-auth.js'

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
  .demandCommand(1)
  .help().argv
