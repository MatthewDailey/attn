import { Page, ElementHandle } from 'puppeteer'
import fs from 'fs'
import path from 'path'

// Helper function for delays since waitForTimeout might not be available in all versions
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

    for (const postElement of postElements) {
      if (screenshotCount >= numPostsToLookAt) {
        break
      }

      try {
        // Get a unique identifier for this post to avoid duplicates
        const postId = await config.getUniqueId(postElement)

        // Skip if we've already captured this post
        if (capturedPosts.has(postId)) {
          continue
        }

        // Check if the post is in the viewport
        const isInViewport = await postElement.evaluate((el) => {
          const rect = el.getBoundingClientRect()
          return rect.top >= 0 && rect.top < window.innerHeight
        })

        if (!isInViewport) {
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
      } catch (error) {
        console.warn(`Failed to capture screenshot of ${platformName} post: ${error}`)
        continue
      }
    }

    // If we haven't reached our target, scroll down to load more posts
    if (screenshotCount < numPostsToLookAt) {
      console.log(`Captured ${screenshotCount}/${numPostsToLookAt} posts, scrolling for more...`)

      // Scroll down to load more content
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 0.8)
      })

      // Wait for new content to load
      await delay(2000)

      // Check if we're at the bottom of the page or no new content is loading
      const currentHeight = await page.evaluate(() => document.body.scrollHeight)
      await delay(1000)
      const newHeight = await page.evaluate(() => document.body.scrollHeight)

      if (currentHeight === newHeight) {
        console.log('Reached end of feed or no new content loading')
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
