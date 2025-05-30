import fs from 'fs'
import path from 'path'

export interface Post {
  id: string
  description: string
  imageUrl: string
  timestamp: Date
  rating: number | null
  platform?: string
  originalPostId?: string
}

interface PostDBData {
  posts: Post[]
  currentIndex: number
  version: string
}

export interface PaginatedResult {
  posts: Post[]
  currentIndex: number
  totalPosts: number
  hasMore: boolean
  hasPrevious: boolean
}

export class PostDB {
  private dbPath: string
  private data!: PostDBData

  constructor(dbPath: string = './posts.json') {
    this.dbPath = path.resolve(dbPath)
    this.loadDB()
  }

  private loadDB(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const rawData = fs.readFileSync(this.dbPath, 'utf-8')
        const parsedData = JSON.parse(rawData)

        // Convert timestamp strings back to Date objects
        if (parsedData.posts) {
          parsedData.posts = parsedData.posts.map((post: any) => ({
            ...post,
            timestamp: new Date(post.timestamp),
          }))
        }

        this.data = {
          posts: parsedData.posts || [],
          currentIndex: parsedData.currentIndex || 0,
          version: parsedData.version || '1.0.0',
        }
      } else {
        this.data = {
          posts: [],
          currentIndex: 0,
          version: '1.0.0',
        }
        this.saveDB()
      }
    } catch (error) {
      console.error('Error loading database:', error)
      this.data = {
        posts: [],
        currentIndex: 0,
        version: '1.0.0',
      }
      this.saveDB()
    }
  }

  private saveDB(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2))
    } catch (error) {
      console.error('Error saving database:', error)
      throw new Error(`Failed to save database: ${error}`)
    }
  }

  /**
   * Generate a unique ID for a post based on its content
   */
  private generatePostId(description: string, imageUrl: string, platform?: string): string {
    // Create a hash-like ID from description + imageUrl + platform
    const content = `${description.slice(0, 100)}_${imageUrl}_${platform || 'unknown'}`
    return content.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50) + '_' + Date.now()
  }

  /**
   * Check if a post already exists based on description and imageUrl
   */
  private postExists(description: string, imageUrl: string): boolean {
    return this.data.posts.some(
      (post) => post.description === description && post.imageUrl === imageUrl,
    )
  }

  /**
   * Add a new post to the database
   */
  addPost(
    description: string,
    imageUrl: string,
    rating: number | null = null,
    platform?: string,
    originalPostId?: string,
  ): string | null {
    // Check for duplicates
    if (this.postExists(description, imageUrl)) {
      console.log('Post already exists, skipping duplicate')
      return null
    }

    const post: Post = {
      id: this.generatePostId(description, imageUrl, platform),
      description,
      imageUrl,
      timestamp: new Date(),
      rating,
      platform,
      originalPostId,
    }

    // Add to the end of the array (most recent)
    this.data.posts.push(post)
    this.saveDB()

    console.log(`Added new post: ${post.id}`)
    return post.id
  }

  /**
   * Update the rating of a post
   */
  updateRating(postId: string, rating: number): boolean {
    const post = this.data.posts.find((p) => p.id === postId)
    if (!post) {
      return false
    }

    post.rating = rating
    this.saveDB()
    return true
  }

  /**
   * Get posts with pagination around the current index
   */
  getPosts(pageSize: number = 10, offsetFromCurrent: number = 0): PaginatedResult {
    const totalPosts = this.data.posts.length

    if (totalPosts === 0) {
      return {
        posts: [],
        currentIndex: 0,
        totalPosts: 0,
        hasMore: false,
        hasPrevious: false,
      }
    }

    // Calculate the starting index for this page
    const targetIndex = Math.max(
      0,
      Math.min(this.data.currentIndex + offsetFromCurrent, totalPosts - 1),
    )

    // Get posts around the target index
    const halfPage = Math.floor(pageSize / 2)
    const startIndex = Math.max(0, targetIndex - halfPage)
    const endIndex = Math.min(totalPosts, startIndex + pageSize)

    // Adjust startIndex if we're near the end
    const adjustedStartIndex = Math.max(0, Math.min(startIndex, totalPosts - pageSize))
    const actualEndIndex = Math.min(totalPosts, adjustedStartIndex + pageSize)

    const posts = this.data.posts
      .slice(adjustedStartIndex, actualEndIndex)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Most recent first

    return {
      posts,
      currentIndex: this.data.currentIndex,
      totalPosts,
      hasMore: actualEndIndex < totalPosts,
      hasPrevious: adjustedStartIndex > 0,
    }
  }

  /**
   * Move to a specific post index
   */
  goToIndex(index: number): boolean {
    if (index < 0 || index >= this.data.posts.length) {
      return false
    }

    this.data.currentIndex = index
    this.saveDB()
    return true
  }

  /**
   * Move forward in the feed
   */
  moveForward(steps: number = 1): boolean {
    const newIndex = Math.min(this.data.currentIndex + steps, this.data.posts.length - 1)
    if (newIndex === this.data.currentIndex) {
      return false // Already at the end
    }

    this.data.currentIndex = newIndex
    this.saveDB()
    return true
  }

  /**
   * Move backward in the feed
   */
  moveBackward(steps: number = 1): boolean {
    const newIndex = Math.max(this.data.currentIndex - steps, 0)
    if (newIndex === this.data.currentIndex) {
      return false // Already at the beginning
    }

    this.data.currentIndex = newIndex
    this.saveDB()
    return true
  }

  /**
   * Get current position info
   */
  getCurrentPosition(): { currentIndex: number; totalPosts: number } {
    return {
      currentIndex: this.data.currentIndex,
      totalPosts: this.data.posts.length,
    }
  }

  /**
   * Get a specific post by ID
   */
  getPost(postId: string): Post | null {
    return this.data.posts.find((p) => p.id === postId) || null
  }

  /**
   * Get all posts (useful for admin/debugging)
   */
  getAllPosts(): Post[] {
    return [...this.data.posts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get posts by rating
   */
  getPostsByRating(rating: number): Post[] {
    return this.data.posts
      .filter((p) => p.rating === rating)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get posts by platform
   */
  getPostsByPlatform(platform: string): Post[] {
    return this.data.posts
      .filter((p) => p.platform === platform)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get database statistics
   */
  getStats(): {
    totalPosts: number
    ratedPosts: number
    unratedPosts: number
    platformBreakdown: Record<string, number>
    ratingBreakdown: Record<string, number>
  } {
    const totalPosts = this.data.posts.length
    const ratedPosts = this.data.posts.filter((p) => p.rating !== null).length
    const unratedPosts = totalPosts - ratedPosts

    const platformBreakdown: Record<string, number> = {}
    const ratingBreakdown: Record<string, number> = {}

    this.data.posts.forEach((post) => {
      // Platform breakdown
      const platform = post.platform || 'unknown'
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1

      // Rating breakdown
      if (post.rating !== null) {
        const rating = post.rating.toString()
        ratingBreakdown[rating] = (ratingBreakdown[rating] || 0) + 1
      }
    })

    return {
      totalPosts,
      ratedPosts,
      unratedPosts,
      platformBreakdown,
      ratingBreakdown,
    }
  }

  /**
   * Delete a post by ID
   */
  deletePost(postId: string): boolean {
    const index = this.data.posts.findIndex((p) => p.id === postId)
    if (index === -1) {
      return false
    }

    this.data.posts.splice(index, 1)

    // Adjust current index if necessary
    if (this.data.currentIndex >= this.data.posts.length) {
      this.data.currentIndex = Math.max(0, this.data.posts.length - 1)
    }

    this.saveDB()
    return true
  }

  /**
   * Clear all posts (use with caution)
   */
  clearAll(): void {
    this.data.posts = []
    this.data.currentIndex = 0
    this.saveDB()
  }
}
