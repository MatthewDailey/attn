import { PostDB } from './post-db.js'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('PostDB', () => {
  const testDbPath = './test-posts.json'
  let db: PostDB

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
    db = new PostDB(testDbPath)
  })

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  test('should create a new database file', () => {
    expect(fs.existsSync(testDbPath)).toBe(true)
  })

  test('should add posts without duplicates', () => {
    const postId1 = db.addPost(
      'Great AI coding tool!',
      'https://example.com/image1.png',
      null,
      'twitter',
      'tweet123',
      undefined, // platformUniqueId
      undefined, // contentHash
      'AI Coding', // category
    )

    const postId2 = db.addPost(
      'Another interesting post',
      'https://example.com/image2.png',
      5,
      'linkedin',
      undefined, // originalPostId
      undefined, // platformUniqueId
      undefined, // contentHash
      'Programming and AI Memes', // category
    )

    // Try to add duplicate
    const duplicateId = db.addPost(
      'Great AI coding tool!',
      'https://example.com/image1.png',
      null,
      'twitter',
      'tweet123',
      undefined, // platformUniqueId
      undefined, // contentHash
      'AI Coding', // category
    )

    expect(postId1).toBeTruthy()
    expect(postId2).toBeTruthy()
    expect(duplicateId).toBeNull()

    const stats = db.getStats()
    expect(stats.totalPosts).toBe(2)
  })

  test('should handle pagination correctly', () => {
    // Add multiple posts
    for (let i = 0; i < 15; i++) {
      db.addPost(
        `Post description ${i}`,
        `https://example.com/image${i}.png`,
        null,
        'twitter',
        undefined,
        undefined,
        undefined,
        'AI Coding',
      )
    }

    // Get first page (starting at index 0)
    const page1 = db.getPosts(5, 0)
    expect(page1.posts.length).toBe(5)
    expect(page1.totalPosts).toBe(15)
    expect(page1.hasMore).toBe(true)
    expect(page1.hasPrevious).toBe(false) // At the beginning, no previous posts

    // Move forward and get next page
    db.moveForward(5)
    const page2 = db.getPosts(5, 0)
    expect(page2.currentIndex).toBe(5)
    expect(page2.hasPrevious).toBe(true) // Now we have previous posts
  })

  test('should update ratings', () => {
    const postId = db.addPost(
      'Test post',
      'https://example.com/test.png',
      null,
      undefined,
      undefined,
      undefined,
      undefined,
      'AI Coding',
    )

    expect(postId).toBeTruthy()
    if (postId) {
      const updated = db.updateRating(postId, 8)
      expect(updated).toBe(true)

      const post = db.getPost(postId)
      expect(post?.rating).toBe(8)
    }
  })

  test('should filter posts by rating and platform', () => {
    db.addPost(
      'Twitter post 1',
      'img1.png',
      5,
      'twitter',
      undefined,
      undefined,
      undefined,
      'AI Coding',
    )
    db.addPost(
      'LinkedIn post 1',
      'img2.png',
      3,
      'linkedin',
      undefined,
      undefined,
      undefined,
      'Programming and AI Memes',
    )
    db.addPost(
      'Twitter post 2',
      'img3.png',
      5,
      'twitter',
      undefined,
      undefined,
      undefined,
      'AI Coding',
    )

    const highRatedPosts = db.getPostsByRating(5)
    expect(highRatedPosts.length).toBe(2)

    const twitterPosts = db.getPostsByPlatform('twitter')
    expect(twitterPosts.length).toBe(2)

    const linkedinPosts = db.getPostsByPlatform('linkedin')
    expect(linkedinPosts.length).toBe(1)
  })

  test('should provide accurate statistics', () => {
    db.addPost('Post 1', 'img1.png', 5, 'twitter', undefined, undefined, undefined, 'AI Coding')
    db.addPost(
      'Post 2',
      'img2.png',
      null,
      'linkedin',
      undefined,
      undefined,
      undefined,
      'Programming and AI Memes',
    )
    db.addPost('Post 3', 'img3.png', 3, 'twitter', undefined, undefined, undefined, 'AI Coding')

    const stats = db.getStats()
    expect(stats.totalPosts).toBe(3)
    expect(stats.ratedPosts).toBe(2)
    expect(stats.unratedPosts).toBe(1)
    expect(stats.platformBreakdown.twitter).toBe(2)
    expect(stats.platformBreakdown.linkedin).toBe(1)
    expect(stats.ratingBreakdown['5']).toBe(1)
    expect(stats.ratingBreakdown['3']).toBe(1)
  })

  test('should handle navigation properly', () => {
    // Add some posts
    for (let i = 0; i < 10; i++) {
      db.addPost(
        `Post ${i}`,
        `img${i}.png`,
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        'AI Coding',
      )
    }

    const initial = db.getCurrentPosition()
    expect(initial.currentIndex).toBe(0)
    expect(initial.totalPosts).toBe(10)

    // Move forward
    const moved1 = db.moveForward(3)
    expect(moved1).toBe(true)
    expect(db.getCurrentPosition().currentIndex).toBe(3)

    // Move backward
    const moved2 = db.moveBackward(1)
    expect(moved2).toBe(true)
    expect(db.getCurrentPosition().currentIndex).toBe(2)

    // Try to move beyond bounds
    const moved3 = db.moveForward(20)
    expect(moved3).toBe(true) // It should move to the last valid position
    expect(db.getCurrentPosition().currentIndex).toBe(9)

    // Try to move before start
    const moved4 = db.moveBackward(20)
    expect(moved4).toBe(true) // Should move to first position
    expect(db.getCurrentPosition().currentIndex).toBe(0)
  })

  test('should persist data across instances', () => {
    // Add some data with first instance
    db.addPost(
      'Persistent post',
      'img.png',
      4,
      'twitter',
      undefined,
      undefined,
      undefined,
      'AI Coding',
    )

    // Move forward only if there are enough posts to move to
    const position = db.getCurrentPosition()
    if (position.totalPosts > 1) {
      db.moveForward(1)
    }

    // Create new instance with same path
    const db2 = new PostDB(testDbPath)

    const stats = db2.getStats()
    expect(stats.totalPosts).toBe(1)

    const position2 = db2.getCurrentPosition()
    // Since we only have 1 post, currentIndex should remain 0
    expect(position2.currentIndex).toBe(0)

    const posts = db2.getAllPosts()
    expect(posts[0].description).toBe('Persistent post')
    expect(posts[0].rating).toBe(4)
  })

  test('should filter posts by category', () => {
    db.addPost('AI post 1', 'img1.png', 5, 'twitter', undefined, undefined, undefined, 'AI Coding')
    db.addPost(
      'Meme post 1',
      'img2.png',
      3,
      'linkedin',
      undefined,
      undefined,
      undefined,
      'Programming and AI Memes',
    )
    db.addPost('AI post 2', 'img3.png', 4, 'twitter', undefined, undefined, undefined, 'AI Coding')
    db.addPost('Uncategorized post', 'img4.png', 2, 'twitter') // No category

    const aiPosts = db.getPostsByCategory('AI Coding')
    expect(aiPosts.length).toBe(2)
    expect(aiPosts.every((post) => post.category === 'AI Coding')).toBe(true)

    const memePosts = db.getPostsByCategory('Programming and AI Memes')
    expect(memePosts.length).toBe(1)
    expect(memePosts[0].category).toBe('Programming and AI Memes')

    const nonExistentCategory = db.getPostsByCategory('Non-existent')
    expect(nonExistentCategory.length).toBe(0)
  })

  test('should get all categories', () => {
    db.addPost('AI post', 'img1.png', 5, 'twitter', undefined, undefined, undefined, 'AI Coding')
    db.addPost(
      'Meme post',
      'img2.png',
      3,
      'linkedin',
      undefined,
      undefined,
      undefined,
      'Programming and AI Memes',
    )
    db.addPost(
      'Another AI post',
      'img3.png',
      4,
      'twitter',
      undefined,
      undefined,
      undefined,
      'AI Coding',
    )
    db.addPost('Uncategorized post', 'img4.png', 2, 'twitter') // No category

    const categories = db.getAllCategories()
    expect(categories).toEqual(['AI Coding', 'Programming and AI Memes'])
    expect(categories.length).toBe(2)
  })

  test('should paginate posts by category', () => {
    // Add multiple posts for the same category
    for (let i = 0; i < 5; i++) {
      db.addPost(
        `AI post ${i}`,
        `img${i}.png`,
        null,
        'twitter',
        undefined,
        undefined,
        undefined,
        'AI Coding',
      )
    }
    for (let i = 0; i < 3; i++) {
      db.addPost(
        `Meme post ${i}`,
        `img${i + 5}.png`,
        null,
        'twitter',
        undefined,
        undefined,
        undefined,
        'Programming and AI Memes',
      )
    }

    const page1 = db.getPostsByCategory_Paginated('AI Coding', 3, 0)
    expect(page1.posts.length).toBe(3)
    expect(page1.totalPosts).toBe(5)
    expect(page1.hasMore).toBe(true)
    expect(page1.hasPrevious).toBe(false)

    const page2 = db.getPostsByCategory_Paginated('AI Coding', 3, 1)
    expect(page2.posts.length).toBe(2)
    expect(page2.hasMore).toBe(false)
    expect(page2.hasPrevious).toBe(true)
  })

  test('should include category breakdown in statistics', () => {
    db.addPost('AI post 1', 'img1.png', 5, 'twitter', undefined, undefined, undefined, 'AI Coding')
    db.addPost('AI post 2', 'img2.png', 3, 'linkedin', undefined, undefined, undefined, 'AI Coding')
    db.addPost(
      'Meme post',
      'img3.png',
      4,
      'twitter',
      undefined,
      undefined,
      undefined,
      'Programming and AI Memes',
    )
    db.addPost('Uncategorized post', 'img4.png', 2, 'twitter') // No category

    const stats = db.getStats()
    expect(stats.categoryBreakdown['AI Coding']).toBe(2)
    expect(stats.categoryBreakdown['Programming and AI Memes']).toBe(1)
    expect(stats.categoryBreakdown['undefined']).toBeUndefined() // Uncategorized posts shouldn't appear
  })

  test('should update categories.json when posts are rated', () => {
    // Create a test categories.json file
    const testCategories = [
      {
        name: 'AI Coding',
        overview: 'Posts about AI coding tools and frameworks',
        likedExamples: [],
        dislikedExamples: [],
      },
      {
        name: 'Programming Memes',
        overview: 'Programming jokes and memes',
        likedExamples: [],
        dislikedExamples: [],
      },
    ]

    // Write test categories file
    fs.writeFileSync('./categories.json', JSON.stringify(testCategories, null, 2))

    // Add posts with categories
    const postId1 = db.addPost(
      'Amazing new AI coding assistant that writes perfect code',
      'img1.png',
      null,
      'twitter',
      undefined,
      undefined,
      undefined,
      'AI Coding',
    )

    const postId2 = db.addPost(
      'Funny meme about debugging at 3am',
      'img2.png',
      null,
      'twitter',
      undefined,
      undefined,
      undefined,
      'Programming Memes',
    )

    const postId3 = db.addPost(
      'Another AI tool for better productivity',
      'img3.png',
      null,
      'twitter',
      undefined,
      undefined,
      undefined,
      'AI Coding',
    )

    expect(postId1).toBeTruthy()
    expect(postId2).toBeTruthy()
    expect(postId3).toBeTruthy()

    if (postId1 && postId2 && postId3) {
      // Rate posts positively and negatively
      db.updateRating(postId1, 1) // Like AI coding post
      db.updateRating(postId2, -1) // Dislike meme post
      db.updateRating(postId3, 1) // Like another AI coding post

      // Check categories.json was updated
      const updatedCategories = JSON.parse(fs.readFileSync('./categories.json', 'utf-8'))

      const aiCodingCategory = updatedCategories.find((c: any) => c.name === 'AI Coding')
      const memesCategory = updatedCategories.find((c: any) => c.name === 'Programming Memes')

      expect(aiCodingCategory.likedExamples).toContain(
        'Amazing new AI coding assistant that writes perfect code',
      )
      expect(aiCodingCategory.likedExamples).toContain('Another AI tool for better productivity')
      expect(aiCodingCategory.dislikedExamples).toHaveLength(0)

      expect(memesCategory.likedExamples).toHaveLength(0)
      expect(memesCategory.dislikedExamples).toContain('Funny meme about debugging at 3am')

      // Test removing rating (unrating)
      db.updateRating(postId1, null)

      const categoriesAfterUnrating = JSON.parse(fs.readFileSync('./categories.json', 'utf-8'))
      const aiCodingAfterUnrating = categoriesAfterUnrating.find((c: any) => c.name === 'AI Coding')

      expect(aiCodingAfterUnrating.likedExamples).not.toContain(
        'Amazing new AI coding assistant that writes perfect code',
      )
      expect(aiCodingAfterUnrating.likedExamples).toContain(
        'Another AI tool for better productivity',
      )

      // Test changing rating from positive to negative
      db.updateRating(postId3, -1)

      const categoriesAfterRatingChange = JSON.parse(fs.readFileSync('./categories.json', 'utf-8'))
      const aiCodingAfterChange = categoriesAfterRatingChange.find(
        (c: any) => c.name === 'AI Coding',
      )

      expect(aiCodingAfterChange.likedExamples).toHaveLength(0)
      expect(aiCodingAfterChange.dislikedExamples).toContain(
        'Another AI tool for better productivity',
      )
    }

    // Clean up test categories file
    if (fs.existsSync('./categories.json')) {
      fs.unlinkSync('./categories.json')
    }
  })
})
