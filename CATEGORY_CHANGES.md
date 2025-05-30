# Category-Based Post Filtering and Querying

## Overview

This update implements category-based filtering for social media posts, ensuring that only posts categorized by AI analysis are stored in the database, along with comprehensive querying capabilities for categories.

## Key Changes

### 1. Database Schema Updates (`post-db.ts`)

- **Added `category` field** to the `Post` interface
- **Updated `addPost` method** to accept an optional `category` parameter
- **Enhanced statistics** to include category breakdown

### 2. New Query Methods

#### Category Filtering

- `getPostsByCategory(category: string)` - Get all posts for a specific category
- `getAllCategories()` - Get list of all unique categories in the database
- `getPostsByCategory_Paginated(category, pageSize, page)` - Paginated category results

#### Enhanced Statistics

- `getStats()` now includes `categoryBreakdown` showing post counts per category

### 3. Post Gatherer Updates (`social-post-gatherer.ts`)

- **Filtering Logic**: Only posts with valid categories (`categoryName !== null`) are added to the database
- **Category Inclusion**: The AI-determined category is now stored with each post
- **Enhanced Logging**: Shows which category each post was assigned when added

### 4. Example Updates

- Updated `post-db-example.ts` to use the new category parameter
- Created `category-example.ts` to demonstrate category functionality
- Updated all test cases in `post-db.test.ts` to include category parameters

## Usage Examples

### Basic Category Querying

```typescript
const db = new PostDB()

// Get all posts in a specific category
const aiPosts = db.getPostsByCategory('AI Coding')

// Get all available categories
const categories = db.getAllCategories()

// Get paginated results for a category
const page = db.getPostsByCategory_Paginated('AI Coding', 10, 0)
```

### Adding Posts with Categories

```typescript
// Only posts with valid categories will be stored
const postId = db.addPost(
  'Description of the post',
  './screenshot.png',
  null, // rating
  'twitter', // platform
  undefined, // originalPostId
  undefined, // platformUniqueId
  undefined, // contentHash
  'AI Coding', // category - this is the new parameter
)
```

### Statistics with Category Breakdown

```typescript
const stats = db.getStats()
console.log(stats.categoryBreakdown)
// Output: { 'AI Coding': 5, 'Programming and AI Memes': 3 }
```

## Filtering Behavior

### In the Post Gatherer

- Posts are analyzed using AI to determine their category
- **Only posts that match one of the provided categories are stored**
- Posts with `categoryName: null` are automatically filtered out
- This ensures the database only contains relevant, categorized content

### Benefits

1. **Quality Control**: Only relevant posts make it into the database
2. **Organization**: Posts are automatically categorized for easy filtering
3. **Efficiency**: No need to manually filter out irrelevant content later
4. **Flexibility**: Easy to query posts by category for specific use cases

## Backward Compatibility

- All existing functionality remains unchanged
- The `category` parameter is optional in `addPost()`
- Existing posts without categories will continue to work
- New query methods are additive and don't affect existing code

## Testing

- All existing tests updated to include category parameters
- New comprehensive test suite for category functionality:
  - Category filtering
  - Category listing
  - Paginated category results
  - Category statistics

## Demo

Run the category example to see the functionality in action:

```bash
npx tsx category-example.ts
```

This will demonstrate:

- Adding posts with different categories
- Querying posts by category
- Getting all available categories
- Paginated category results
- Statistics with category breakdown
