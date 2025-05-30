/**
 * @fileoverview This file defines a command-line interface using yargs. It provides commands for social media authentication and browser automation.
 */

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { SocialAuth } from '../social-auth.js'
import { scrollAndGatherTwitter } from '../twitter-utils.js'
import { scrollAndGatherLinkedin } from '../linkedin-utils.js'
import { reviewSocialPost } from '../social-post-reviewer.js'
import { gatherAndStorePosts } from '../social-post-gatherer.js'
import { PostDB } from '../post-db.js'
import type { Category } from '../social-post-reviewer.js'
import path from 'path'
import os from 'os'

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
          default: path.join(os.homedir(), '.attn', 'screenshots', 'twitter'),
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
  .command(
    'linkedin-screenshots [count] [directory]',
    'Capture screenshots of LinkedIn posts',
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
          default: path.join(os.homedir(), '.attn', 'screenshots', 'linkedin'),
        })
    },
    async (argv) => {
      try {
        const loginStatus = socialAuth.isLoggedIn()

        // Login to LinkedIn if needed
        if (!loginStatus.linkedin) {
          console.log('💼 Need to login to LinkedIn first...')
          await socialAuth.login()
        }

        // Start browser with authenticated session
        console.log('🌐 Starting browser with authenticated LinkedIn session...')
        const pages = await socialAuth.startBrowser()

        // Use the authenticated LinkedIn page
        await pages.withLinkedin(async (page) => {
          console.log('💼 Using authenticated LinkedIn page...')
          const title = await page.title()
          console.log('LinkedIn page title:', title)

          // Wait a moment for the page to fully load
          console.log('⏳ Waiting for page to fully load...')
          await new Promise((resolve) => setTimeout(resolve, 3000))

          // Set up screenshot directory
          const screenshotDir = path.resolve(argv.directory)
          const numPostsToCapture = argv.count

          console.log(`📸 Capturing ${numPostsToCapture} LinkedIn posts to ${screenshotDir}...`)

          try {
            // Try the main function first
            await scrollAndGatherLinkedin(page, screenshotDir, numPostsToCapture)
          } catch (error) {
            console.warn('⚠️ Main function failed, trying alternative method...')
            console.error('Main error:', error)
          }

          console.log('✅ Screenshot capture completed!')
        })

        console.log('🔄 Process completed! You can now close the browser window.')
      } catch (error) {
        console.error('LinkedIn screenshot capture failed:', error)
        process.exit(1)
      }
    },
  )
  .command(
    'review-post <imagePath>',
    'Review a social media post image using AI',
    (yargs) => {
      return yargs
        .positional('imagePath', {
          describe: 'Path to the image file to review',
          type: 'string',
          demandOption: true,
        })
        .option('categories', {
          alias: 'c',
          describe: 'Path to JSON file containing categories (optional)',
          type: 'string',
        })
    },
    async (argv) => {
      try {
        let categories: Category[] = [
          {
            name: 'AI Coding',
            overview: 'Posts about AI coding tools, AI coding agents, and AI coding frameworks',
            likedExamples: [],
            dislikedExamples: [],
          },
          {
            name: 'Programming and AI Memes',
            overview: 'Programming and AI memes, jokes, and funny content',
            likedExamples: [],
            dislikedExamples: [],
          },
        ]

        // Load custom categories if provided
        if (argv.categories) {
          try {
            const fs = await import('fs')
            const categoriesJson = fs.readFileSync(argv.categories, 'utf-8')
            categories = JSON.parse(categoriesJson)
            console.log(`📂 Loaded ${categories.length} custom categories from ${argv.categories}`)
          } catch (error) {
            console.warn(
              `⚠️ Could not load categories from ${argv.categories}, using default categories`,
            )
          }
        } else {
          console.log('📋 Using default sample categories')
        }

        console.log('🔍 Analyzing image with AI...')
        const result = await reviewSocialPost(argv.imagePath, categories)

        console.log('\n📊 Analysis Results:')
        console.log('='.repeat(50))
        console.log('📝 Description:')
        console.log(result.description)
        console.log('\n🏷️ Category Match:')
        if (result.categoryName) {
          console.log(`✅ ${result.categoryName}`)
        } else {
          console.log('❌ No matching category found')
        }
        console.log('='.repeat(50))
      } catch (error) {
        console.error('❌ Failed to review post:', error)
        process.exit(1)
      }
    },
  )
  .command(
    'gather-posts',
    'Gather posts from both platforms and store them in the database',
    (yargs) => {
      return yargs
        .option('count', {
          alias: 'c',
          describe: 'Number of posts to gather',
          type: 'number',
          default: 10,
        })
        .option('categories', {
          alias: 'C',
          describe: 'Path to JSON file containing categories (optional)',
          type: 'string',
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
            const numPostsToGather = argv.count

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

            console.log('✅ Posts gathering completed!')
          })
        })

        console.log('🔄 Process completed! You can now close the browser window.')
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

        console.log('\n💡 Use "rate-post <id> <rating>" to rate posts (1-5)')
      } catch (error) {
        console.error('❌ Failed to list posts:', error)
        process.exit(1)
      }
    },
  )
  .command(
    'rate-post <postId> <rating>',
    'Rate a post by its ID',
    (yargs) => {
      return yargs
        .positional('postId', {
          describe: 'ID of the post to rate',
          type: 'string',
          demandOption: true,
        })
        .positional('rating', {
          describe: 'Rating (1-5)',
          type: 'number',
          demandOption: true,
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
        if (argv.rating < 1 || argv.rating > 5) {
          console.error('❌ Rating must be between 1 and 5')
          process.exit(1)
        }

        const postDB = new PostDB(argv.dbPath)
        const success = postDB.updateRating(argv.postId, argv.rating)

        if (success) {
          console.log(`✅ Successfully rated post ${argv.postId} with ${argv.rating} stars`)
        } else {
          console.error(`❌ Post with ID ${argv.postId} not found`)
          process.exit(1)
        }
      } catch (error) {
        console.error('❌ Failed to rate post:', error)
        process.exit(1)
      }
    },
  )
  .demandCommand(1)
  .help().argv
