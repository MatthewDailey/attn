import { Page } from 'puppeteer'
import { PostDB } from './post-db.js'
import { reviewSocialPost, type Category } from './social-post-reviewer.js'
import { focusBrowserTab } from './social-media-utils.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface GatherPostsOptions {
  numPosts: number
  screenshotDir: string
  dbPath?: string
  categories?: Category[]
  platforms: ('twitter' | 'linkedin')[]
}

export interface PlatformResult {
  platform: string
  postsGathered: number
  postsAddedToDb: number
  errors: string[]
}

export interface GatherPostsResult {
  totalPostsGathered: number
  totalPostsAddedToDb: number
  platformResults: PlatformResult[]
  screenshotDir: string
}

const defaultCategories: Category[] = [
  {
    name: 'AI Coding',
    overview: 'Posts about AI coding tools, AI coding agents, and AI coding frameworks',
    likedExamples: [
      'New AI coding assistant that helps write better code',
      'AI agent that can debug and fix code automatically',
      'Framework for building AI coding applications',
    ],
    dislikedExamples: ['General programming tutorials without AI', 'Basic coding tips'],
  },
  {
    name: 'Programming and AI Memes',
    overview: 'Programming and AI memes, jokes, and funny content',
    likedExamples: [
      'Funny AI chatbot conversations',
      'Programming jokes and memes',
      'AI mishaps and funny bugs',
    ],
    dislikedExamples: ['Generic tech memes', 'Non-programming related humor'],
  },
]

/**
 * Gather posts from specified social media platforms, take screenshots, analyze with AI, and store in database
 */
export async function gatherAndStorePosts(
  twitterPage: Page | null,
  linkedinPage: Page | null,
  options: GatherPostsOptions,
): Promise<GatherPostsResult> {
  const {
    numPosts,
    screenshotDir = path.join(os.homedir(), '.attn', 'screenshots'),
    dbPath = path.join(os.homedir(), '.attn', 'posts.json'),
    categories = defaultCategories,
    platforms,
  } = options

  // Initialize database
  const postDB = new PostDB(dbPath)

  // Ensure screenshot directory exists
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true })
    console.log(`📁 Created screenshot directory: ${screenshotDir}`)
  }

  const results: GatherPostsResult = {
    totalPostsGathered: 0,
    totalPostsAddedToDb: 0,
    platformResults: [],
    screenshotDir,
  }

  // Process each platform
  for (const platform of platforms) {
    const platformResult: PlatformResult = {
      platform,
      postsGathered: 0,
      postsAddedToDb: 0,
      errors: [],
    }

    try {
      let page: Page | null = null
      let platformDir = ''

      if (platform === 'twitter' && twitterPage) {
        page = twitterPage
        platformDir = path.join(screenshotDir, 'twitter')
      } else if (platform === 'linkedin' && linkedinPage) {
        page = linkedinPage
        platformDir = path.join(screenshotDir, 'linkedin')
      }

      if (!page) {
        platformResult.errors.push(`No authenticated ${platform} page available`)
        results.platformResults.push(platformResult)
        continue
      }

      // Ensure platform directory exists
      if (!fs.existsSync(platformDir)) {
        fs.mkdirSync(platformDir, { recursive: true })
      }

      console.log(`📱 Gathering ${numPosts} posts from ${platform}...`)

      // Bring the page to the front and ensure it's focused
      await focusBrowserTab(page, platform)

      // Capture screenshots using existing utility
      const capturedFiles = await capturePostScreenshots(page, platformDir, numPosts, platform)
      platformResult.postsGathered = capturedFiles.length

      console.log(`📸 Captured ${capturedFiles.length} screenshots from ${platform}`)

      // Process each screenshot with AI and store in database
      for (const { filePath, platformUniqueId } of capturedFiles) {
        try {
          console.log(`🤖 Analyzing ${path.resolve(filePath)}...`)

          // Analyze with AI
          const analysis = await reviewSocialPost(filePath, categories)

          // Only add to database if categorized as one of the provided options
          if (analysis.categoryName === null) {
            console.log(`⏭️ Skipping uncategorized post: ${path.resolve(filePath)}`)
            continue
          }

          // Calculate content hash for deduplication
          const contentHash = PostDB.calculateContentHash(filePath)

          // Add to database with category
          const postId = postDB.addPost(
            analysis.description,
            filePath, // screenshotPath
            null, // No rating initially
            platform,
            undefined, // originalPostId
            platformUniqueId,
            contentHash,
            analysis.categoryName, // Include category
          )

          if (postId) {
            platformResult.postsAddedToDb++
            console.log(`✅ Added post ${postId} to database (Category: ${analysis.categoryName})`)
          } else {
            console.log(`⏭️ Skipped duplicate post: ${path.resolve(filePath)}`)
          }
        } catch (error) {
          const errorMsg = `Failed to process ${path.resolve(filePath)}: ${error}`
          console.error(`❌ ${errorMsg}`)
          platformResult.errors.push(errorMsg)
        }
      }
    } catch (error) {
      const errorMsg = `Failed to gather posts from ${platform}: ${error}`
      console.error(`❌ ${errorMsg}`)
      platformResult.errors.push(errorMsg)
    }

    results.platformResults.push(platformResult)
    results.totalPostsGathered += platformResult.postsGathered
    results.totalPostsAddedToDb += platformResult.postsAddedToDb
  }

  return results
}

/**
 * Enhanced screenshot capture that returns file paths and platform unique IDs
 */
async function capturePostScreenshots(
  page: Page,
  directory: string,
  numPosts: number,
  platform: string,
): Promise<Array<{ filePath: string; platformUniqueId: string }>> {
  const results: Array<{ filePath: string; platformUniqueId: string }> = []

  // Import the platform-specific config from social-media-utils
  // Note: We'll need to expose these configs or recreate them here
  const config = getPlatformConfig(platform)

  console.log(`📸 Starting enhanced screenshot capture for ${platform}...`)

  // Wait for posts to load
  try {
    await page.waitForSelector(config.postSelector, { timeout: config.timeout })
  } catch (error) {
    console.warn(`Could not find posts with primary selector, trying alternatives...`)
    if (config.fallbackSelectors) {
      let found = false
      for (const fallback of config.fallbackSelectors) {
        try {
          await page.waitForSelector(fallback, { timeout: 5000 })
          found = true
          break
        } catch (e) {
          continue
        }
      }
      if (!found) {
        throw new Error(`No posts found on ${platform} page`)
      }
    }
  }

  const capturedPosts = new Set<string>()
  let screenshotCount = 0
  let roundsWithoutProgress = 0
  const maxRoundsWithoutProgress = 3

  while (screenshotCount < numPosts) {
    // Get post elements
    const postElements = await page.$$(config.postSelector)

    if (postElements.length === 0) {
      console.log('No post elements found, breaking...')
      break
    }

    let processedInThisRound = 0

    for (const postElement of postElements) {
      if (screenshotCount >= numPosts) break

      try {
        // Get unique ID for deduplication
        const platformUniqueId = await config.getUniqueId(postElement)

        if (capturedPosts.has(platformUniqueId)) {
          continue
        }

        // Check if in viewport
        const isInViewport = await postElement.evaluate((el) => {
          const rect = el.getBoundingClientRect()
          return rect.top >= -200 && rect.top < window.innerHeight + 200
        })

        if (!isInViewport) {
          continue
        }

        // Scroll into view
        await postElement.evaluate((el) => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })

        await new Promise((resolve) => setTimeout(resolve, 500))

        // Expand content if supported
        if (config.expandContent) {
          await config.expandContent(postElement)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        // Take screenshot
        const filename = `${platform}_${screenshotCount + 1}_${platformUniqueId}.png`
        const filePath = path.join(directory, filename)

        const buffer = await postElement.screenshot({ type: 'png' })
        fs.writeFileSync(filePath, buffer)

        results.push({ filePath, platformUniqueId })
        capturedPosts.add(platformUniqueId)
        screenshotCount++
        processedInThisRound++

        console.log(`📸 ${screenshotCount}/${numPosts}: ${path.resolve(filePath)}`)
      } catch (error) {
        console.warn(`Failed to capture post: ${error}`)
        continue
      }
    }

    if (processedInThisRound === 0) {
      roundsWithoutProgress++
      if (roundsWithoutProgress >= maxRoundsWithoutProgress) {
        console.log('No progress in multiple rounds, ending capture')
        break
      }
    } else {
      roundsWithoutProgress = 0
    }

    // Scroll for more content
    if (screenshotCount < numPosts) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 0.8)
      })
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  return results
}

/**
 * Get platform-specific configuration
 */
function getPlatformConfig(platform: string) {
  if (platform === 'twitter') {
    return {
      postSelector: 'article[data-testid="tweet"]',
      fallbackSelectors: ['article'],
      getUniqueId: async (element: any) => {
        return await element.evaluate((el: any) => {
          const linkElement = el.querySelector('a[href*="/status/"]')
          if (linkElement) {
            const href = linkElement.getAttribute('href')
            const match = href?.match(/\/status\/(\d+)/)
            if (match) return match[1]
          }
          const textElement =
            el.querySelector('[data-testid="tweetText"]') ||
            el.querySelector('[lang]') ||
            el.querySelector('span')
          if (textElement) {
            return textElement.textContent?.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'
          }
          return Math.random().toString(36).substring(7)
        })
      },
      expandContent: async (element: any) => {
        return await element.evaluate((el: any) => {
          // Look for "Show more" buttons/spans
          const showMoreSelectors = ['span', '*[role="button"]']

          let clickedExpansion = false

          for (const selector of showMoreSelectors) {
            const elements = Array.from(el.querySelectorAll(selector))

            for (const element of elements) {
              const htmlElement = element as HTMLElement
              const text = htmlElement.textContent?.toLowerCase() || ''

              // Check if element contains "show more" text
              if (text.includes('show more') || (text.includes('show') && text.includes('more'))) {
                const rect = htmlElement.getBoundingClientRect()
                const isVisible = rect.height > 0 && rect.width > 0
                const isClickable = htmlElement.offsetParent !== null

                if (isVisible && isClickable) {
                  console.log(`Found expandable content: "${htmlElement.textContent?.trim()}"`)
                  htmlElement.click()
                  clickedExpansion = true
                  break
                }
              }
            }

            if (clickedExpansion) break
          }

          return clickedExpansion
        })
      },
      timeout: 10000,
    }
  } else if (platform === 'linkedin') {
    return {
      postSelector: 'div[data-id^="urn:li:activity:"]',
      fallbackSelectors: ['div[data-id*="activity"]', '.feed-shared-update-v2'],
      getUniqueId: async (element: any) => {
        return await element.evaluate((el: any) => {
          const dataId = el.getAttribute('data-id')
          if (dataId && dataId.includes('urn:li:activity:')) {
            const match = dataId.match(/urn:li:activity:(\d+)/)
            if (match) return match[1]
          }
          const textElement = el.querySelector('.feed-shared-text') || el.querySelector('span')
          if (textElement) {
            return textElement.textContent?.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'
          }
          return Math.random().toString(36).substring(7)
        })
      },
      expandContent: async (element: any) => {
        return await element.evaluate((el: any) => {
          // Look for LinkedIn-specific "see more" and "show more" buttons/spans
          const seeMoreSelectors = [
            'button[aria-label*="see more"]',
            'button',
            'span',
            '*[role="button"]',
            'a',
          ]

          let clickedExpansion = false

          for (const selector of seeMoreSelectors) {
            const elements = Array.from(el.querySelectorAll(selector))

            for (const element of elements) {
              const htmlElement = element as HTMLElement
              const text = htmlElement.textContent?.toLowerCase() || ''
              const ariaLabel = htmlElement.getAttribute('aria-label')?.toLowerCase() || ''

              // Check if element contains LinkedIn "see more", "...more", or "show more" text
              if (
                text.includes('see more') ||
                text.includes('...more') ||
                text.includes('show more') ||
                ariaLabel.includes('see more') ||
                (text.includes('more') && text.length < 20) // Short text containing "more"
              ) {
                const rect = htmlElement.getBoundingClientRect()
                const isVisible = rect.height > 0 && rect.width > 0
                const isClickable = htmlElement.offsetParent !== null

                if (isVisible && isClickable) {
                  console.log(
                    `Found expandable LinkedIn content: "${htmlElement.textContent?.trim()}"`,
                  )
                  htmlElement.click()
                  clickedExpansion = true

                  // Remove focus to prevent blue outlines in screenshots
                  setTimeout(() => {
                    if (document.activeElement && document.activeElement !== document.body) {
                      ;(document.activeElement as HTMLElement).blur()
                    }
                  }, 100)

                  break
                }
              }
            }

            if (clickedExpansion) break
          }

          return clickedExpansion
        })
      },
      timeout: 8000,
    }
  }

  throw new Error(`Unsupported platform: ${platform}`)
}
