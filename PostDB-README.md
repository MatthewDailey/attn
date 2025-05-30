# PostDB - Social Media Post Database

A TypeScript-based database for storing and managing social media posts with pagination, rating, and filtering capabilities. Backed by a simple JSON file for persistence.

## Features

- **JSON File Storage**: Simple, portable database backed by JSON
- **Duplicate Prevention**: Automatically prevents duplicate posts based on description and image URL
- **Pagination**: Navigate through posts with pagination support
- **Rating System**: Rate posts from 1-10 and track preferences
- **Platform Support**: Track posts from different social media platforms
- **Time-based Ordering**: Posts are ordered by when they were discovered
- **Statistics**: Get insights about your post collection
- **Filtering**: Filter posts by rating or platform

## Installation

The PostDB is included in this project. Simply import and use it:

```typescript
import { PostDB } from './post-db.js'
```

## Basic Usage

### Initialize Database

```typescript
// Default path: ./posts.json
const db = new PostDB()

// Custom path
const db = new PostDB('./my-posts.json')
```

### Adding Posts

```typescript
// Basic post
const postId = db.addPost('Great article about AI coding tools', '/path/to/screenshot.png')

// With all optional fields
const postId = db.addPost(
  'Interesting LinkedIn post about developers',
  '/screenshots/linkedin_post.png',
  8, // initial rating
  'linkedin', // platform
  'urn:li:activity:123456', // original post ID
)
```

### Rating Posts

```typescript
// Rate a post (1-10 scale)
const success = db.updateRating(postId, 7)

// Get a specific post
const post = db.getPost(postId)
console.log(`Rating: ${post?.rating}`)
```

### Navigation and Pagination

```typescript
// Get current page of posts (10 posts by default)
const page = db.getPosts(10)
console.log(`Showing ${page.posts.length} of ${page.totalPosts} posts`)

// Navigate through the feed
db.moveForward(5) // Move 5 posts forward
db.moveBackward(2) // Move 2 posts back
db.goToIndex(0) // Go to specific index

// Get posts with offset from current position
const nextPage = db.getPosts(10, 5) // 10 posts, 5 positions ahead

// Check navigation state
const position = db.getCurrentPosition()
console.log(`Position: ${position.currentIndex}/${position.totalPosts}`)
```

### Filtering and Querying

```typescript
// Get posts by rating
const highRatedPosts = db.getPostsByRating(8)
const lowRatedPosts = db.getPostsByRating(3)

// Get posts by platform
const twitterPosts = db.getPostsByPlatform('twitter')
const linkedinPosts = db.getPostsByPlatform('linkedin')

// Get all posts (sorted by timestamp)
const allPosts = db.getAllPosts()
```

### Statistics

```typescript
const stats = db.getStats()
console.log(`
  Total posts: ${stats.totalPosts}
  Rated: ${stats.ratedPosts}
  Unrated: ${stats.unratedPosts}
  Platforms: ${JSON.stringify(stats.platformBreakdown)}
  Ratings: ${JSON.stringify(stats.ratingBreakdown)}
`)
```

## Integration with Social Media Workflow

### Processing Screenshots

```typescript
import { processPostScreenshot } from './post-db-example.js'

// Process a single screenshot
const postId = await processPostScreenshot(
  './screenshots/twitter_post_1.png',
  'twitter',
  'tweet_123456789',
)

// Process an entire directory
await processScreenshotDirectory('./screenshots')
```

### Web Interface Integration

```typescript
// Get posts for display in web UI
const displayData = getPostsForDisplay(10, 0)
// Returns: { posts: [...], pagination: { currentIndex, totalPosts, hasMore, hasPrevious } }

// Rate a post from web interface
const result = ratePost(postId, 8)
if (result.success) {
  console.log('Post rated successfully')
}
```

## API Reference

### PostDB Class

#### Constructor

- `new PostDB(dbPath?: string)` - Initialize database with optional custom path

#### Adding and Updating Posts

- `addPost(description, imageUrl, rating?, platform?, originalPostId?)` - Add new post, returns postId or null if duplicate
- `updateRating(postId, rating)` - Update post rating (1-10), returns boolean success
- `deletePost(postId)` - Delete a post, returns boolean success

#### Navigation

- `getPosts(pageSize?, offsetFromCurrent?)` - Get paginated posts around current position
- `moveForward(steps?)` - Move forward in feed, returns boolean success
- `moveBackward(steps?)` - Move backward in feed, returns boolean success
- `goToIndex(index)` - Go to specific post index, returns boolean success
- `getCurrentPosition()` - Get current position info

#### Querying

- `getPost(postId)` - Get specific post by ID
- `getAllPosts()` - Get all posts sorted by timestamp
- `getPostsByRating(rating)` - Filter posts by rating
- `getPostsByPlatform(platform)` - Filter posts by platform
- `getStats()` - Get database statistics

#### Admin

- `clearAll()` - Clear all posts (use with caution)

### Data Types

#### Post Interface

```typescript
interface Post {
  id: string
  description: string
  imageUrl: string
  timestamp: Date
  rating: number | null
  platform?: string
  originalPostId?: string
}
```

#### PaginatedResult Interface

```typescript
interface PaginatedResult {
  posts: Post[]
  currentIndex: number
  totalPosts: number
  hasMore: boolean
  hasPrevious: boolean
}
```

## Example Workflows

### 1. Daily Social Media Review

```typescript
const db = new PostDB('./social-posts.json')

// Process today's screenshots
await processScreenshotDirectory('./screenshots/today')

// Start rating session
const unratedPosts = db.getAllPosts().filter((p) => p.rating === null)
console.log(`${unratedPosts.length} posts to review`)

// Navigate and rate posts
for (const post of unratedPosts.slice(0, 10)) {
  console.log(`\nPost: ${post.description}`)
  // In real app: show image, get user input
  const rating = 7 // example rating
  db.updateRating(post.id, rating)
}
```

### 2. Export Highly Rated Posts

```typescript
const highRatedPosts = db
  .getPostsByRating(8)
  .concat(db.getPostsByRating(9))
  .concat(db.getPostsByRating(10))

console.log(`Found ${highRatedPosts.length} highly rated posts`)
// Export or further process these posts
```

### 3. Platform Analysis

```typescript
const stats = db.getStats()
Object.entries(stats.platformBreakdown).forEach(([platform, count]) => {
  const avgRating =
    db
      .getPostsByPlatform(platform)
      .filter((p) => p.rating !== null)
      .reduce((sum, p) => sum + p.rating!, 0) / count

  console.log(`${platform}: ${count} posts, avg rating: ${avgRating.toFixed(1)}`)
})
```

## Testing

Run the test suite:

```bash
npm test post-db.test.ts
```

The tests cover:

- Database creation and persistence
- Adding posts and duplicate prevention
- Pagination and navigation
- Rating updates
- Filtering by platform and rating
- Statistics generation
- Data persistence across instances

## File Structure

- `post-db.ts` - Main PostDB class
- `post-db.test.ts` - Test suite
- `post-db-example.ts` - Integration examples and helper functions
- `posts.json` - Default database file (created automatically)

## Notes

- The database file is automatically created if it doesn't exist
- Posts are ordered by discovery time (when added to database)
- The current index pointer is persisted across sessions
- Duplicate detection is based on exact match of description and imageUrl
- All timestamps are stored as ISO strings in JSON but converted to Date objects in memory
