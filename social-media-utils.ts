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

    // Click on the page to ensure it's focused (sometimes needed for proper focus)
    await page.click('body')

    // Brief wait to ensure focus is properly set
    await delay(1000)

    console.log(`✅ ${platformName} tab is now focused`)
  } catch (error) {
    console.warn(`⚠️ Could not focus ${platformName} tab: ${error}`)
    // Continue anyway - focusing is nice to have but not critical
  }
}

// Platform-specific configuration
export interface PlatformConfig {
  postSelector: string
  fallbackSelectors?: string[]
  expandSelectors?: string[]
  getUniqueId: (element: ElementHandle) => Promise<string>
  expandContent?: (element: ElementHandle) => Promise<boolean>
  timeout: number
}

// Twitter platform configuration
const twitterConfig: PlatformConfig = {
  postSelector: 'article[data-testid="tweet"]',
  fallbackSelectors: ['article'],
  expandSelectors: [
    'span:contains("Show more")',
    '*[role="button"]:contains("Show")',
    '*[role="button"]:contains("more")',
  ],
  getUniqueId: async (element: ElementHandle) => {
    return await element.evaluate((el) => {
      // Try to find a unique identifier - tweet ID from href or data attributes
      const linkElement = el.querySelector('a[href*="/status/"]')
      if (linkElement) {
        const href = linkElement.getAttribute('href')
        const match = href?.match(/\/status\/(\d+)/)
        if (match) return match[1]
      }

      // Fallback to using the first few words of the tweet text
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
  expandContent: async (element: ElementHandle) => {
    return await element.evaluate((el) => {
      // Common selectors for "Show More" type links on Twitter
      const showMoreSelectors = [
        'span:contains("Show more")',
        '*[role="button"]:contains("Show")',
        '*[role="button"]:contains("more")',
      ]

      let clickedExpansion = false

      // Try each selector
      for (const selector of showMoreSelectors) {
        let elements: Element[] = []

        // Handle :contains pseudo-selector manually
        if (selector.includes(':contains(')) {
          const baseSelector = selector.split(':contains(')[0]
          const containsText = selector.match(/:contains\("([^"]+)"\)/)?.[1]
          if (containsText) {
            const allElements = el.querySelectorAll(baseSelector)
            elements = Array.from(allElements).filter(
              (elem) =>
                elem.textContent &&
                elem.textContent.toLowerCase().includes(containsText.toLowerCase()),
            )
          }
        } else {
          elements = Array.from(el.querySelectorAll(selector))
        }

        for (const element of elements) {
          // Check if the element is visible and clickable
          const rect = element.getBoundingClientRect()
          const isVisible = rect.height > 0 && rect.width > 0
          const isClickable = (element as HTMLElement).offsetParent !== null

          if (isVisible && isClickable) {
            console.log(`Found expandable content: "${element.textContent?.trim()}"`)
            ;(element as HTMLElement).click()
            clickedExpansion = true
            break
          }
        }

        if (clickedExpansion) break
      }

      return clickedExpansion
    })
  },
  timeout: 10000,
}

// LinkedIn platform configuration
const linkedinConfig: PlatformConfig = {
  postSelector: 'div[data-id^="urn:li:activity:"]',
  fallbackSelectors: ['div[data-id*="activity"]', '.feed-shared-update-v2'],
  getUniqueId: async (element: ElementHandle) => {
    return await element.evaluate((el) => {
      // Try to get the data-id attribute which contains the activity URN
      const dataId = el.getAttribute('data-id')
      if (dataId && dataId.includes('urn:li:activity:')) {
        const match = dataId.match(/urn:li:activity:(\d+)/)
        if (match) return match[1]
      }

      // Fallback to text content
      const textElement = el.querySelector('.feed-shared-text') || el.querySelector('span')
      if (textElement) {
        return textElement.textContent?.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'
      }

      return Math.random().toString(36).substring(7)
    })
  },
  expandContent: async (element: ElementHandle) => {
    return await element.evaluate((el) => {
      // LinkedIn "see more" and "...more" links
      const seeMoreSelectors = [
        'button[aria-label*="see more"]',
        'button:contains("see more")',
        'button:contains("...more")',
        'button:contains("more")',
        'span:contains("...more")',
        'span:contains("more")',
        '.feed-shared-inline-show-more-text button',
        'button[data-control-name="see_more_text"]',
        // Look for any clickable element with "more" text
        '*[role="button"]:contains("more")',
        'a:contains("more")',
      ]

      let clickedExpansion = false

      for (const selector of seeMoreSelectors) {
        let elements: Element[] = []

        // Handle :contains pseudo-selector manually
        if (selector.includes(':contains(')) {
          const baseSelector = selector.split(':contains(')[0]
          const containsText = selector.match(/:contains\("([^"]+)"\)/)?.[1]
          if (containsText) {
            const allElements = el.querySelectorAll(baseSelector)
            elements = Array.from(allElements).filter(
              (elem) =>
                elem.textContent &&
                elem.textContent.toLowerCase().includes(containsText.toLowerCase()),
            )
          }
        } else {
          elements = Array.from(el.querySelectorAll(selector))
        }

        for (const element of elements) {
          // Check if the element is visible and clickable
          const rect = element.getBoundingClientRect()
          const isVisible = rect.height > 0 && rect.width > 0
          const isClickable = (element as HTMLElement).offsetParent !== null

          if (isVisible && isClickable) {
            console.log(`Found expandable LinkedIn content: "${element.textContent?.trim()}"`)
            ;(element as HTMLElement).click()
            clickedExpansion = true

            // Remove focus from any focused elements to prevent blue outlines in screenshots
            setTimeout(() => {
              if (document.activeElement && document.activeElement !== document.body) {
                ;(document.activeElement as HTMLElement).blur()
              }
              // Also remove focus from any elements within this post
              const focusedElements = el.querySelectorAll(':focus')
              focusedElements.forEach((focusedEl) => {
                ;(focusedEl as HTMLElement).blur()
              })
            }, 100)

            break
          }
        }

        if (clickedExpansion) break
      }

      return clickedExpansion
    })
  },
  timeout: 8000,
}

/**
 * Generic function to scroll through a social media platform and capture post screenshots
 * @param page - Puppeteer page instance
 * @param directory - Directory path where screenshots should be saved
 * @param numPostsToLookAt - Number of posts to capture screenshots of
 * @param config - Platform-specific configuration
 * @param platformName - Name of the platform for logging
 */
async function scrollAndGatherPosts(
  page: Page,
  directory: string,
  numPostsToLookAt: number,
  config: PlatformConfig,
  platformName: string,
): Promise<void> {
  console.log(`Starting to gather ${numPostsToLookAt} ${platformName} posts...`)

  // Bring the page to the front and ensure it's focused
  await focusBrowserTab(page, platformName)

  // Ensure the directory exists
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
    console.log(`Created directory: ${directory}`)
  }

  // Wait for the page to load and posts to be visible
  try {
    await page.waitForSelector(config.postSelector, { timeout: config.timeout })
  } catch (error) {
    console.warn(
      `Could not find posts with selector "${config.postSelector}", trying alternative selectors...`,
    )

    if (config.fallbackSelectors) {
      let foundFallback = false
      for (const fallbackSelector of config.fallbackSelectors) {
        try {
          await page.waitForSelector(fallbackSelector, { timeout: 5000 })
          console.log(`Found posts using fallback selector: ${fallbackSelector}`)
          foundFallback = true
          break
        } catch (e) {
          continue
        }
      }

      if (!foundFallback) {
        throw new Error(
          `No post elements found on the page. Make sure you are on the ${platformName} feed page.`,
        )
      }
    } else {
      throw new Error(
        `No post elements found on the page. Make sure you are on the ${platformName} feed page.`,
      )
    }
  }

  const capturedPosts = new Set<string>()
  let screenshotCount = 0
  let roundsWithoutProgress = 0
  const maxRoundsWithoutProgress = 3

  while (screenshotCount < numPostsToLookAt) {
    // Get all post elements currently visible - try primary selector first, then fallbacks
    let postElements: ElementHandle[] = []

    try {
      postElements = await page.$$(config.postSelector)
    } catch (e) {
      // Try fallback selectors if primary fails
      if (config.fallbackSelectors) {
        for (const fallbackSelector of config.fallbackSelectors) {
          try {
            postElements = await page.$$(fallbackSelector)
            if (postElements.length > 0) break
          } catch (e) {
            continue
          }
        }
      }
    }

    if (postElements.length === 0) {
      console.log('No post elements found, breaking...')
      break
    }

    console.log(`Found ${postElements.length} post elements on current viewport`)

    // Process posts in the current viewport
    let processedInThisRound = 0
    for (const postElement of postElements) {
      if (screenshotCount >= numPostsToLookAt) {
        break
      }

      try {
        // Get a unique identifier for this post to avoid duplicates
        const postId = await config.getUniqueId(postElement)

        // Skip if we've already captured this post
        if (capturedPosts.has(postId)) {
          console.log(`⏭️  Skipping already captured post: ${postId}`)
          continue
        }

        // Check if the post is in the viewport or close to it
        const isInViewport = await postElement.evaluate((el) => {
          const rect = el.getBoundingClientRect()
          // More lenient viewport check - include posts that are partially visible or just outside
          return rect.top >= -200 && rect.top < window.innerHeight + 200
        })

        if (!isInViewport) {
          console.log(`👁️  Post ${postId} not in viewport, skipping`)
          continue
        }

        // Scroll the post into view
        await postElement.evaluate((el) => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })

        // Wait a moment for any animations to complete
        await delay(500)

        // Expand content if the platform supports it
        if (config.expandContent) {
          const expandedContent = await config.expandContent(postElement)
          if (expandedContent) {
            console.log(`📖 Expanded content for ${platformName} post ${postId}`)
            // For LinkedIn, give extra time for focus removal and content to fully load
            const expandDelay = platformName === 'LinkedIn' ? 1500 : 1000
            await delay(expandDelay)
          }
        }

        // Take a screenshot of the post
        const filename = `${platformName.toLowerCase()}_${screenshotCount + 1}_${postId}.png`
        const filepath = path.join(directory, filename)

        // Write the screenshot buffer to file
        const buffer = await postElement.screenshot({
          type: 'png',
        })
        fs.writeFileSync(filepath, buffer)

        console.log(`📸 Screenshot ${screenshotCount + 1}/${numPostsToLookAt}: ${filename}`)

        capturedPosts.add(postId)
        screenshotCount++
        processedInThisRound++
      } catch (error) {
        console.warn(`Failed to capture screenshot of ${platformName} post: ${error}`)
        continue
      }
    }

    console.log(
      `📊 Processed ${processedInThisRound} new posts in this round (${screenshotCount}/${numPostsToLookAt} total)`,
    )

    // Check if we're making progress
    if (processedInThisRound === 0) {
      roundsWithoutProgress++
      if (roundsWithoutProgress >= maxRoundsWithoutProgress) {
        console.log('🛑 No progress in multiple rounds, ending capture')
        break
      }
    } else {
      roundsWithoutProgress = 0
    }

    // If we haven't reached our target, scroll down to load more posts
    if (screenshotCount < numPostsToLookAt) {
      console.log(`Captured ${screenshotCount}/${numPostsToLookAt} posts, scrolling for more...`)

      // Get current post count before scrolling
      const initialPostCount = postElements.length
      let newContentLoaded = false
      let scrollAttempts = 0
      const maxScrollAttempts = 5

      while (!newContentLoaded && scrollAttempts < maxScrollAttempts) {
        scrollAttempts++
        console.log(`Scroll attempt ${scrollAttempts}/${maxScrollAttempts}`)

        // Gradual scrolling to trigger lazy loading - multiple smaller scrolls
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight * 0.3)
          })
          await delay(800) // Wait between small scrolls
        }

        // Additional wait for content to load
        await delay(3000)

        // Check for new posts by counting elements, not just page height
        let newPostElements: ElementHandle[] = []
        try {
          newPostElements = await page.$$(config.postSelector)
        } catch (e) {
          // Try fallback selectors
          if (config.fallbackSelectors) {
            for (const fallbackSelector of config.fallbackSelectors) {
              try {
                newPostElements = await page.$$(fallbackSelector)
                if (newPostElements.length > 0) break
              } catch (e) {
                continue
              }
            }
          }
        }

        console.log(`Post count: ${initialPostCount} -> ${newPostElements.length}`)

        // Check if we found new posts
        if (newPostElements.length > initialPostCount) {
          newContentLoaded = true
          console.log(`✅ Found ${newPostElements.length - initialPostCount} new posts`)
        } else {
          console.log(`⏳ No new posts yet, waiting longer...`)

          // Try scrolling to the very bottom to trigger more loading
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight)
          })
          await delay(2000)

          // Check one more time after bottom scroll
          try {
            const bottomCheckPosts = await page.$$(config.postSelector)
            if (bottomCheckPosts.length > initialPostCount) {
              newContentLoaded = true
              console.log(
                `✅ Found ${bottomCheckPosts.length - initialPostCount} new posts after bottom scroll`,
              )
            }
          } catch (e) {
            // Continue to next attempt
          }
        }
      }

      if (!newContentLoaded) {
        console.log('🛑 No new content loaded after multiple scroll attempts, ending capture')
        break
      }
    }
  }

  console.log(
    `✅ Completed! Captured ${screenshotCount} ${platformName} post screenshots in ${directory}`,
  )
}

/**
 * Scrolls through Twitter's home page and takes screenshots of posts
 * @param page - Puppeteer page instance opened to Twitter's home page
 * @param directory - Directory path where screenshots should be saved
 * @param numPostsToLookAt - Number of posts to capture screenshots of
 */
export async function scrollAndGatherTwitter(
  page: Page,
  directory: string,
  numPostsToLookAt: number,
): Promise<void> {
  return scrollAndGatherPosts(page, directory, numPostsToLookAt, twitterConfig, 'Twitter')
}

/**
 * Scrolls through LinkedIn's feed page and takes screenshots of posts
 * @param page - Puppeteer page instance opened to LinkedIn's feed page
 * @param directory - Directory path where screenshots should be saved
 * @param numPostsToLookAt - Number of posts to capture screenshots of
 */
export async function scrollAndGatherLinkedin(
  page: Page,
  directory: string,
  numPostsToLookAt: number,
): Promise<void> {
  return scrollAndGatherPosts(page, directory, numPostsToLookAt, linkedinConfig, 'LinkedIn')
}
