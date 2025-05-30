import { Page } from 'puppeteer'
import fs from 'fs'
import path from 'path'

// Helper function for delays since waitForTimeout might not be available in all versions
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
  console.log(`Starting to gather ${numPostsToLookAt} Twitter posts...`)

  // Ensure the directory exists
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
    console.log(`Created directory: ${directory}`)
  }

  // Wait for the page to load and posts to be visible
  try {
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 })
  } catch (error) {
    console.warn('Could not find tweets with data-testid="tweet", trying alternative selectors...')
    try {
      await page.waitForSelector('article', { timeout: 5000 })
    } catch (error) {
      throw new Error(
        'No article elements found on the page. Make sure you are on Twitter home page.',
      )
    }
  }

  const capturedPosts = new Set<string>()
  let screenshotCount = 0

  while (screenshotCount < numPostsToLookAt) {
    // Get all article elements currently visible
    const articles = await page.$$('article')

    if (articles.length === 0) {
      console.log('No articles found, breaking...')
      break
    }

    console.log(`Found ${articles.length} articles on current viewport`)

    for (const article of articles) {
      if (screenshotCount >= numPostsToLookAt) {
        break
      }

      try {
        // Get a unique identifier for this post to avoid duplicates
        const postId = await article.evaluate((el) => {
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

        // Skip if we've already captured this post
        if (capturedPosts.has(postId)) {
          continue
        }

        // Check if the article is in the viewport
        const isInViewport = await article.evaluate((el) => {
          const rect = el.getBoundingClientRect()
          return rect.top >= 0 && rect.top < window.innerHeight
        })

        if (!isInViewport) {
          continue
        }

        // Scroll the article into view
        await article.evaluate((el) => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })

        // Wait a moment for any animations to complete
        await delay(500)

        // Check for and click "Show More" or similar expansion links
        const expandedContent = await article.evaluate((el) => {
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

        // If we expanded content, wait for it to load
        if (expandedContent) {
          console.log(`📖 Expanded content for post ${postId}`)
          await delay(1000) // Wait for content to expand
        }

        // Take a screenshot of the article
        const filename = `tweet_${screenshotCount + 1}_${postId}.png`
        const filepath = path.join(directory, filename)

        // Write the screenshot buffer to file to handle the type issue
        const buffer = await article.screenshot({
          type: 'png',
        })
        fs.writeFileSync(filepath, buffer)

        console.log(`📸 Screenshot ${screenshotCount + 1}/${numPostsToLookAt}: ${filename}`)

        capturedPosts.add(postId)
        screenshotCount++
      } catch (error) {
        console.warn(`Failed to capture screenshot of article: ${error}`)
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

  console.log(`✅ Completed! Captured ${screenshotCount} Twitter post screenshots in ${directory}`)
}
