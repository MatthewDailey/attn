import { PostDB } from './post-db.js'
import path from 'path'
import os from 'os'

/**
 * Example demonstrating the new category functionality
 */

// Initialize database
const dbPath = path.join(os.homedir(), '.attn', 'category-demo.json')
const db = new PostDB(dbPath)

// Clear existing data for clean demo
db.clearAll()

console.log('🏷️  Category Functionality Demo')
console.log('===============================\n')

// Add sample posts with different categories
console.log('📝 Adding sample posts with categories...')

db.addPost(
  'Amazing new AI coding assistant that writes perfect TypeScript code',
  './screenshots/ai-tool-1.png',
  null,
  'twitter',
  'tweet_123',
  undefined,
  undefined,
  'AI Coding',
)

db.addPost(
  'Hilarious meme about debugging at 3 AM with AI chatbots',
  './screenshots/meme-1.png',
  8,
  'linkedin',
  'post_456',
  undefined,
  undefined,
  'Programming and AI Memes',
)

db.addPost(
  'New AI framework for automated code reviews and testing',
  './screenshots/ai-tool-2.png',
  9,
  'twitter',
  'tweet_789',
  undefined,
  undefined,
  'AI Coding',
)

db.addPost(
  'When ChatGPT explains your own code better than you can',
  './screenshots/meme-2.png',
  7,
  'twitter',
  'tweet_101',
  undefined,
  undefined,
  'Programming and AI Memes',
)

db.addPost(
  'AI-powered debugging tool that finds bugs before you write them',
  './screenshots/ai-tool-3.png',
  null,
  'linkedin',
  'post_112',
  undefined,
  undefined,
  'AI Coding',
)

// This post would NOT be added in real usage since it has no category
// but we're adding it here to show it exists but won't appear in category queries
console.log('\n📊 Database Statistics:')
const stats = db.getStats()
console.log(`Total posts: ${stats.totalPosts}`)
console.log(`Category breakdown:`, stats.categoryBreakdown)
console.log(`Platform breakdown:`, stats.platformBreakdown)
console.log(`Rating breakdown:`, stats.ratingBreakdown)

console.log('\n🏷️  Available Categories:')
const categories = db.getAllCategories()
categories.forEach((category) => {
  console.log(`  - ${category}`)
})

console.log('\n🔍 Posts by Category:')

// Show AI Coding posts
console.log('\n"AI Coding" posts:')
const aiPosts = db.getPostsByCategory('AI Coding')
aiPosts.forEach((post, index) => {
  console.log(`  ${index + 1}. ${post.description.substring(0, 60)}...`)
  console.log(`     Platform: ${post.platform}, Rating: ${post.rating || 'Unrated'}`)
})

// Show Programming and AI Memes posts
console.log('\n"Programming and AI Memes" posts:')
const memePosts = db.getPostsByCategory('Programming and AI Memes')
memePosts.forEach((post, index) => {
  console.log(`  ${index + 1}. ${post.description.substring(0, 60)}...`)
  console.log(`     Platform: ${post.platform}, Rating: ${post.rating || 'Unrated'}`)
})

console.log('\n📄 Paginated Category Results:')
// Demonstrate pagination for AI Coding category
const paginatedResults = db.getPostsByCategory_Paginated('AI Coding', 2, 0)
console.log(
  `Page 1 of "AI Coding" posts (${paginatedResults.posts.length}/${paginatedResults.totalPosts}):`,
)
paginatedResults.posts.forEach((post, index) => {
  console.log(`  ${index + 1}. ${post.description.substring(0, 50)}...`)
})
console.log(`Has more pages: ${paginatedResults.hasMore}`)

console.log('\n🎯 Filtering Behavior:')
console.log('In the post gatherer, only posts with valid categories are stored.')
console.log('Uncategorized posts (categoryName: null) are automatically filtered out.')
console.log('This ensures your database only contains relevant, categorized content.')

console.log('\n✅ Demo completed! Check your database at:', dbPath)
