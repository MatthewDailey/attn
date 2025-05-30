import { PostDB } from './post-db.js'
import { reviewSocialPost, type ReviewResult } from './social-post-reviewer.js'
import fs from 'fs'
import path from 'path'

/**
 * Example of how to integrate PostDB with the social media review workflow
 */

// Initialize the database
const db = new PostDB('./social-posts.json')

// Example categories (you can customize these)
const categories = [
  {
    name: 'AI Coding Tools',
    overview:
      'Posts about AI-powered development tools, coding assistants, and programming automation',
    likedExamples: [
      'Building cool stuff with AI',
      'New AI models, especially related to AI coding',
      'AI agent developers',
      'AI coding tools',
    ],
    dislikedExamples: [],
  },
  {
    name: 'Unwanted Content',
    overview: 'Content that should be filtered out',
    likedExamples: [],
    dislikedExamples: [
      'Fund raising posts',
      'Job updates',
      'Recruiting posts',
      'Political content',
    ],
  },
]

/**
 * Process a screenshot by reviewing it and adding to database
 */
export async function processPostScreenshot(
  imagePath: string,
  platform: string = 'unknown',
  originalPostId?: string,
): Promise<string | null> {
  try {
    console.log(`Processing ${imagePath}...`)

    // Review the post using AI
    const reviewResult: ReviewResult = await reviewSocialPost(imagePath, categories)

    console.log(`Review result: ${reviewResult.description}`)
    console.log(`Category: ${reviewResult.categoryName || 'None'}`)

    // Determine if we want to keep this post
    const shouldKeep = reviewResult.categoryName === 'AI Coding Tools'

    if (!shouldKeep) {
      console.log('Post filtered out - not relevant')
      return null
    }

    // Add to database
    const postId = db.addPost(
      reviewResult.description,
      imagePath,
      null, // No initial rating
      platform,
      originalPostId,
    )

    if (postId) {
      console.log(`Added post ${postId} to database`)
    }

    return postId
  } catch (error) {
    console.error(`Error processing ${imagePath}:`, error)
    return null
  }
}

/**
 * Process all screenshots in a directory
 */
export async function processScreenshotDirectory(directoryPath: string): Promise<void> {
  if (!fs.existsSync(directoryPath)) {
    console.error(`Directory ${directoryPath} does not exist`)
    return
  }

  const files = fs.readdirSync(directoryPath)
  const imageFiles = files.filter(
    (file) =>
      file.toLowerCase().endsWith('.png') ||
      file.toLowerCase().endsWith('.jpg') ||
      file.toLowerCase().endsWith('.jpeg'),
  )

  console.log(`Found ${imageFiles.length} image files to process`)

  for (const file of imageFiles) {
    const imagePath = path.join(directoryPath, file)

    // Extract platform from filename if possible
    let platform = 'unknown'
    if (file.toLowerCase().includes('twitter')) {
      platform = 'twitter'
    } else if (file.toLowerCase().includes('linkedin')) {
      platform = 'linkedin'
    }

    await processPostScreenshot(imagePath, platform)

    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // Show final stats
  const stats = db.getStats()
  console.log('\n=== Final Statistics ===')
  console.log(`Total posts in database: ${stats.totalPosts}`)
  console.log(`Rated posts: ${stats.ratedPosts}`)
  console.log(`Unrated posts: ${stats.unratedPosts}`)
  console.log('Platform breakdown:', stats.platformBreakdown)
  console.log('Rating breakdown:', stats.ratingBreakdown)
}

/**
 * Interactive rating session - rate posts one by one
 */
export function startRatingSession(): void {
  console.log('Starting interactive rating session...')
  console.log('Use numbers 1-10 to rate posts, "skip" to skip, "quit" to exit')

  const position = db.getCurrentPosition()
  console.log(`Current position: ${position.currentIndex}/${position.totalPosts}`)

  // Get current page of posts
  const page = db.getPosts(1, 0) // Get 1 post at current position

  if (page.posts.length === 0) {
    console.log('No posts to rate!')
    return
  }

  const currentPost = page.posts[0]
  console.log('\n--- Current Post ---')
  console.log(`ID: ${currentPost.id}`)
  console.log(`Description: ${currentPost.description}`)
  console.log(`Platform: ${currentPost.platform}`)
  console.log(`Current rating: ${currentPost.rating || 'Unrated'}`)
  console.log(`Image: ${currentPost.imageUrl}`)

  // In a real implementation, you'd use readline or similar for user input
  // This is just a demonstration of the API
}

/**
 * Get posts for display in a web interface
 */
export function getPostsForDisplay(pageSize: number = 10, offset: number = 0) {
  const page = db.getPosts(pageSize, offset)

  return {
    posts: page.posts.map((post) => ({
      id: post.id,
      description: post.description,
      imageUrl: post.imageUrl,
      timestamp: post.timestamp.toISOString(),
      rating: post.rating,
      platform: post.platform,
      originalPostId: post.originalPostId,
    })),
    pagination: {
      currentIndex: page.currentIndex,
      totalPosts: page.totalPosts,
      hasMore: page.hasMore,
      hasPrevious: page.hasPrevious,
    },
  }
}

/**
 * Rate a post via web interface
 */
export function ratePost(postId: string, rating: number): { success: boolean; message: string } {
  if (rating < 1 || rating > 10) {
    return { success: false, message: 'Rating must be between 1 and 10' }
  }

  const success = db.updateRating(postId, rating)

  if (success) {
    return { success: true, message: 'Post rated successfully' }
  } else {
    return { success: false, message: 'Post not found' }
  }
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  // This script is being run directly
  console.log('PostDB Example')
  console.log('==============')

  // Show current stats
  const stats = db.getStats()
  console.log(`Current database has ${stats.totalPosts} posts`)

  // Example of adding a post manually
  const postId = db.addPost(
    'Example post about a new AI coding tool that helps with debugging',
    './screenshots/example.png',
    null,
    'twitter',
    'tweet_123456',
  )

  if (postId) {
    console.log(`Added example post: ${postId}`)

    // Rate the post
    db.updateRating(postId, 8)
    console.log('Rated the post 8/10')

    // Show the post
    const post = db.getPost(postId)
    console.log('Retrieved post:', JSON.stringify(post, null, 2))
  }

  // Show updated stats
  const newStats = db.getStats()
  console.log('\nUpdated stats:', newStats)
}
