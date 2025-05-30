/**
 * @fileoverview This file defines a command-line interface using yargs. It provides commands for social media authentication and browser automation.
 */

import os from 'os'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { PostDB } from '../post-db.js'
import { SocialAuth } from '../social-auth.js'
import { gatherAndStorePosts } from '../social-post-gatherer.js'

const socialAuth = new SocialAuth()

yargs(hideBin(process.argv))
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
    'gather-posts',
    'Gather posts from both platforms and store them in the database',
    (yargs) => {
      return yargs
        .option('num', {
          alias: 'n',
          describe: 'Number of posts to gather',
          type: 'number',
          default: 10,
        })
        .option('categories', {
          alias: 'c',
          describe: 'Path to JSON file containing categories (optional)',
          type: 'string',
          default: path.join(os.homedir(), '.attn', 'categories.json'),
        })
    },
    async (argv) => {
      try {
        const loginStatus = socialAuth.isLoggedIn()

        // Login to both platforms if needed
        if (!loginStatus.linkedin) {
          console.log('💼 Need to login to LinkedIn first...')
          await socialAuth.login()
        }
        if (!loginStatus.twitter) {
          console.log('📱 Need to login to Twitter first...')
          await socialAuth.login()
        }

        // Start browser with authenticated session
        console.log('🌐 Starting browser with authenticated platforms...')
        const pages = await socialAuth.startBrowser()

        // Use the authenticated platforms
        await pages.withTwitter(async (twitterPage) => {
          console.log('📱 Using authenticated Twitter page...')
          const twitterTitle = await twitterPage.title()
          console.log('Twitter page title:', twitterTitle)

          await pages.withLinkedin(async (linkedinPage) => {
            console.log('💼 Using authenticated LinkedIn page...')
            const linkedinTitle = await linkedinPage.title()
            console.log('LinkedIn page title:', linkedinTitle)

            // Wait a moment for the pages to fully load
            console.log('⏳ Waiting for pages to fully load...')
            await new Promise((resolve) => setTimeout(resolve, 3000))

            // Load custom categories if provided
            let categories = undefined
            if (argv.categories) {
              try {
                const fs = await import('fs')
                const categoriesJson = fs.readFileSync(argv.categories, 'utf-8')
                categories = JSON.parse(categoriesJson)
                console.log(
                  `📂 Loaded ${categories.length} custom categories from ${argv.categories}`,
                )
              } catch (error) {
                console.warn(
                  `⚠️ Could not load categories from ${argv.categories}, using default categories`,
                )
              }
            }

            // Set up screenshot directory
            const screenshotDir = path.resolve(path.join(os.homedir(), '.attn', 'screenshots'))
            const numPostsToGather = argv.num

            console.log(
              `📸 Gathering ${numPostsToGather} posts from both platforms to ${screenshotDir}...`,
            )

            try {
              const result = await gatherAndStorePosts(twitterPage, linkedinPage, {
                numPosts: numPostsToGather,
                screenshotDir,
                categories,
                platforms: ['twitter', 'linkedin'],
              })

              console.log('\n📊 Gathering Results:')
              console.log('='.repeat(50))
              console.log(`📸 Total posts captured: ${result.totalPostsGathered}`)
              console.log(`💾 Total posts added to database: ${result.totalPostsAddedToDb}`)
              console.log(`📁 Screenshots saved to: ${result.screenshotDir}`)

              for (const platformResult of result.platformResults) {
                console.log(`\n${platformResult.platform.toUpperCase()}:`)
                console.log(`  📸 Posts captured: ${platformResult.postsGathered}`)
                console.log(`  💾 Posts added to DB: ${platformResult.postsAddedToDb}`)
                if (platformResult.errors.length > 0) {
                  console.log(`  ❌ Errors: ${platformResult.errors.length}`)
                  platformResult.errors.forEach((error) => console.log(`    - ${error}`))
                }
              }
              console.log('='.repeat(50))
            } catch (error) {
              console.warn('⚠️ Post gathering failed:', error)
            }

            console.log('\n✅ Posts gathering completed! Open http://localhost:3000 to view them.')
          })
        })
      } catch (error) {
        console.error('Failed to gather posts:', error)
        process.exit(1)
      }
    },
  )
  .command(
    'list-posts',
    'List posts from the database',
    (yargs) => {
      return yargs
        .option('count', {
          alias: 'c',
          describe: 'Number of posts to list',
          type: 'number',
          default: 10,
        })
        .option('db-path', {
          alias: 'd',
          describe: 'Path to the database file',
          type: 'string',
          default: path.join(os.homedir(), '.attn', 'posts.json'),
        })
    },
    async (argv) => {
      try {
        const postDB = new PostDB(argv.dbPath)
        const result = postDB.getPosts(argv.count)

        console.log('\n📋 Posts from Database:')
        console.log('='.repeat(70))
        console.log(`📊 Total posts in database: ${result.totalPosts}`)
        console.log(`📄 Showing ${result.posts.length} posts`)
        console.log('='.repeat(70))

        if (result.posts.length === 0) {
          console.log(
            '📭 No posts found in database. Run "gather-posts" to collect some posts first.',
          )
          return
        }

        result.posts.forEach((post, index) => {
          console.log(`\n📱 Post #${index + 1}`)
          console.log(`🆔 ID: ${post.id}`)
          console.log(`🌐 Platform: ${post.platform || 'Unknown'}`)
          console.log(
            `📅 Date: ${post.timestamp.toLocaleDateString()} ${post.timestamp.toLocaleTimeString()}`,
          )
          console.log(`⭐ Rating: ${post.rating !== null ? post.rating : 'Not rated'}`)
          if (post.platformUniqueId) {
            console.log(`🔗 Platform ID: ${post.platformUniqueId}`)
          }
          console.log(
            `📝 Description: ${post.description.substring(0, 200)}${post.description.length > 200 ? '...' : ''}`,
          )
          if (post.screenshotPath) {
            console.log(`🖼️ Screenshot: ${post.screenshotPath}`)
          }
          console.log('-'.repeat(50))
        })
      } catch (error) {
        console.error('❌ Failed to list posts:', error)
        process.exit(1)
      }
    },
  )
  .command(
    'clear-posts',
    'Clear all posts from the database',
    (yargs) => {
      return yargs
        .option('db-path', {
          alias: 'd',
          describe: 'Path to the database file',
          type: 'string',
          default: path.join(os.homedir(), '.attn', 'posts.json'),
        })
        .option('confirm', {
          alias: 'y',
          describe: 'Skip confirmation prompt',
          type: 'boolean',
          default: false,
        })
    },
    async (argv) => {
      try {
        const postDB = new PostDB(argv.dbPath)
        const stats = postDB.getStats()

        if (stats.totalPosts === 0) {
          console.log('📭 Database is already empty - no posts to clear.')
          return
        }

        if (!argv.confirm) {
          console.log(`⚠️  Warning: This will permanently delete ${stats.totalPosts} posts from the database.`)
          console.log(`📂 Database path: ${argv.dbPath}`)
          console.log('Use --confirm or -y to skip this prompt.')
          process.exit(0)
        }

        postDB.clearAll()
        console.log(`🗑️  Successfully cleared ${stats.totalPosts} posts from the database.`)
      } catch (error) {
        console.error('❌ Failed to clear posts:', error)
        process.exit(1)
      }
    },
  )
  .demandCommand(1)
  .help().argv
