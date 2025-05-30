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
    )

    const postId2 = db.addPost(
      'Another interesting post',
      'https://example.com/image2.png',
      5,
      'linkedin',
    )

    // Try to add duplicate
    const duplicateId = db.addPost(
      'Great AI coding tool!',
      'https://example.com/image1.png',
      null,
      'twitter',
      'tweet123',
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
      db.addPost(`Post description ${i}`, `https://example.com/image${i}.png`, null, 'twitter')
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
    const postId = db.addPost('Test post', 'https://example.com/test.png')

    expect(postId).toBeTruthy()
    if (postId) {
      const updated = db.updateRating(postId, 8)
      expect(updated).toBe(true)

      const post = db.getPost(postId)
      expect(post?.rating).toBe(8)
    }
  })

  test('should filter posts by rating and platform', () => {
    db.addPost('Twitter post 1', 'img1.png', 5, 'twitter')
    db.addPost('LinkedIn post 1', 'img2.png', 3, 'linkedin')
    db.addPost('Twitter post 2', 'img3.png', 5, 'twitter')

    const highRatedPosts = db.getPostsByRating(5)
    expect(highRatedPosts.length).toBe(2)

    const twitterPosts = db.getPostsByPlatform('twitter')
    expect(twitterPosts.length).toBe(2)

    const linkedinPosts = db.getPostsByPlatform('linkedin')
    expect(linkedinPosts.length).toBe(1)
  })

  test('should provide accurate statistics', () => {
    db.addPost('Post 1', 'img1.png', 5, 'twitter')
    db.addPost('Post 2', 'img2.png', null, 'linkedin')
    db.addPost('Post 3', 'img3.png', 3, 'twitter')

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
      db.addPost(`Post ${i}`, `img${i}.png`)
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
    db.addPost('Persistent post', 'img.png', 4, 'twitter')

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
})
