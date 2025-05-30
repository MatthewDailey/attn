# web-starter

This is a starter project for a SPA webapp with an API 

## Stack details

- React for frontend
- Express for backend API
- TypeScript throughout
- Vite for bundling and dev server (including HMR)
- Vitest for testing
- CLI support with yargs
- Puppeteer for web automation and social media interaction

## Development

```
npm install
npm run dev     # Starts dev server with hot reload
npm run cli     # Run CLI commands
npm run test    # Run tests
npm run check   # TypeScript checks
npm run format  # Format code with prettier
```

## Environment Setup

For AI-powered social post review functionality, you'll need a Google Gemini API key:

1. **Get a Google API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key

2. **Set Environment Variable**:
   ```bash
   # Mac/Linux
   export GOOGLE_API_KEY="your_api_key_here"
   
   # Windows
   setx GOOGLE_API_KEY "your_api_key_here"
   ```

   Or create a `.env` file in your project root:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

> **Note**: Never commit your `.env` file with real API keys to version control.

## Social Media Automation

This project includes functionality for automating interactions with social media platforms like Twitter and LinkedIn using Puppeteer, as well as AI-powered content analysis.

### Quick Start

1. **Login to social platforms**:
   ```bash
   npm run cli login
   ```

2. **Capture Twitter screenshots**:
   ```bash
   npm run cli twitter-screenshots 5        # Capture 5 posts
   npm run cli twitter-screenshots 10 ./my-screenshots  # Custom directory
   ```

3. **Capture LinkedIn screenshots**:
   ```bash
   npm run cli linkedin-screenshots 5       # Capture 5 posts
   npm run cli linkedin-screenshots 10 ./my-linkedin-screenshots  # Custom directory
   ```

4. **Review social media posts with AI**:
   ```bash
   npm run cli review-post ./path/to/image.png
   npm run cli review-post ./screenshot.jpg --categories ./my-categories.json
   ```

5. **Check login status**:
   ```bash
   npm run cli status
   ```

### Social Media Screenshot Capture

The project includes refactored functions `scrollAndGatherTwitter` and `scrollAndGatherLinkedin` that allow you to automatically scroll through social media feeds and capture screenshots of individual posts. Both functions share common logic while handling platform-specific differences.

#### Twitter Screenshots

##### CLI Usage (Recommended)

```bash
# Capture 10 Twitter posts (default)
npm run cli twitter-screenshots

# Capture specific number of posts
npm run cli twitter-screenshots 5

# Specify custom directory
npm run cli twitter-screenshots 10 ./my-screenshots

# Get help
npm run cli twitter-screenshots --help
```

##### Programmatic Usage

```typescript
import { SocialAuth } from './social-auth.js'
import { scrollAndGatherTwitter } from './twitter-utils.js'

const socialAuth = new SocialAuth()
const pages = await socialAuth.startBrowser()

await pages.withTwitter(async (page) => {
  await scrollAndGatherTwitter(page, './screenshots', 10)
})
```

#### LinkedIn Screenshots

##### CLI Usage (Recommended)

```bash
# Capture 10 LinkedIn posts (default)
npm run cli linkedin-screenshots

# Capture specific number of posts
npm run cli linkedin-screenshots 5

# Specify custom directory
npm run cli linkedin-screenshots 10 ./my-linkedin-screenshots

# Get help
npm run cli linkedin-screenshots --help
```

##### Programmatic Usage

```typescript
import { SocialAuth } from './social-auth.js'
import { scrollAndGatherLinkedin } from './linkedin-utils.js'

const socialAuth = new SocialAuth()
const pages = await socialAuth.startBrowser()

await pages.withLinkedin(async (page) => {
  await scrollAndGatherLinkedin(page, './screenshots', 10)
})
```

#### Parameters (Both Platforms)

- `count`: Number of posts to capture screenshots of (default: 10)
- `directory`: Directory path where screenshots will be saved (default: './twitter-screenshots' or './linkedin-screenshots')

#### Features

- 📸 **Cross-platform support**: Works with both Twitter and LinkedIn
- 🔄 **Scrolls through feeds**: Automatically scrolls to find more posts
- 🎯 **Avoids duplicates**: Uses unique post identifiers to prevent duplicate captures
- 📁 **Auto-creates directories**: Creates output directory if it doesn't exist
- ⚡ **Fallback selectors**: Includes multiple methods for finding posts on different layouts
- 🛡️ **Error handling**: Robust error handling and retry logic
- 🔐 **Authenticated sessions**: Uses existing authentication system (no manual login required)
- 📖 **Auto-expands content**: Automatically clicks "Show More" links to capture full posts
- 🏗️ **Extensible architecture**: Easy to add support for additional social media platforms

#### Platform-Specific Details

**Twitter**:
- Identifies posts using `article[data-testid="tweet"]` selector
- Extracts unique IDs from tweet status URLs
- Handles "Show more" expansion for long tweets

**LinkedIn**:
- Identifies posts using `div[data-id^="urn:li:activity:"]` selector
- Extracts unique IDs from LinkedIn activity URNs
- Handles "see more" expansion for long posts

#### Requirements

- You must be logged into the respective platform using `npm run cli login`
- The authentication system will handle cookies and session management

### Available CLI Commands

```bash
npm run cli login                     # Login to Twitter and LinkedIn
npm run cli status                    # Check current login status
npm run cli logout                    # Clear saved authentication
npm run cli browser                   # Start authenticated browser session
npm run cli twitter-screenshots      # Capture Twitter post screenshots
npm run cli linkedin-screenshots     # Capture LinkedIn post screenshots  
npm run cli review-post <imagePath>   # Analyze social media post with AI
```

### Social Authentication

The project includes a `SocialAuth` class that handles login to both Twitter and LinkedIn:

```typescript
import { SocialAuth } from './social-auth.js'

const socialAuth = new SocialAuth()
await socialAuth.login()  // Opens browser for manual login
const pages = await socialAuth.startBrowser()  // Returns authenticated pages

// Use Twitter page
await pages.withTwitter(async (page) => {
  await scrollAndGatherTwitter(page, './screenshots', 5)
})

// Use LinkedIn page  
await pages.withLinkedin(async (page) => {
  await scrollAndGatherLinkedin(page, './screenshots', 5)
})
```

### AI-Powered Social Post Review

The `reviewSocialPost` function uses Google Gemini AI to analyze social media post images and categorize them based on your preferences.

#### Features

- 🤖 **AI Analysis**: Uses Google Gemini to analyze post content, text, and visual elements
- 🏷️ **Smart Categorization**: Matches posts to your predefined categories based on content and examples
- 💡 **Few-shot Learning**: Uses your liked/disliked examples to better understand your preferences
- 📊 **Structured Output**: Returns detailed descriptions and category classifications
- 🎯 **Customizable**: Define your own categories with specific preferences

#### CLI Usage

```bash
# Analyze a screenshot with default categories
npm run cli review-post ./twitter-screenshots/tweet_1_123456.png

# Use custom categories
npm run cli review-post ./image.jpg --categories ./my-categories.json

# Get help
npm run cli review-post --help
```

#### Programmatic Usage

```typescript
import { reviewSocialPost, Category } from './social-post-reviewer.js'

const categories: Category[] = [
  {
    name: 'Tech News',
    overview: 'Posts about technology, software development, AI, and tech industry news',
    likedExamples: [
      'Breakthrough in AI research shows 50% improvement in language understanding',
      'New JavaScript framework promises 10x faster development'
    ],
    dislikedExamples: [
      'Tech company announces another round of layoffs',
      'Privacy concerns raised over new social media platform'
    ]
  }
  // ... more categories
]

const result = await reviewSocialPost('./path/to/image.png', categories)
console.log('Description:', result.description)
console.log('Category:', result.categoryName) // string | null
```

#### Category Structure

Each category should have the following structure:

```typescript
interface Category {
  name: string                    // Category name
  overview: string               // Brief description of the category
  likedExamples: string[]       // Examples of posts you like in this category
  dislikedExamples: string[]    // Examples of posts you dislike in this category
}
```

The `likedExamples` and `dislikedExamples` help the AI understand your specific preferences within each category, acting as few-shot examples to improve classification accuracy.

#### Example Categories File

See `sample-categories.json` for a complete example with categories like:
- **Tech News**: Technology and software development content
- **Educational**: Learning resources and tutorials  
- **Career Development**: Professional growth and workplace advice
- **Personal Finance**: Financial advice and money management

You can customize these categories or create your own based on your interests and preferences.

## Deploy with Render 

Create a project and connect the Github repo on [Render](https://render.com/)

## Deploy with Railway

Create a project and service in [Railway](https://railway.com/) and link it to this project.
```
railway link
npm run deploy 
```

Alternately, link the service to the Github repo for `main` to be automatically deployed.
```

# Social Media Post Gatherer

This project provides tools to automatically gather, analyze, and rate social media posts from Twitter and LinkedIn using AI.

## Features

- **Authentication**: Secure login to Twitter and LinkedIn with cookie persistence
- **Post Collection**: Automated screenshot capture from both platforms
- **AI Analysis**: Intelligent post description and categorization using Google's Gemini AI
- **Post Database**: Local storage with deduplication and rating system
- **Enhanced Unique IDs**: Uses platform-specific IDs and content hashing for better deduplication

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your Google AI API key:
```bash
export GOOGLE_AI_API_KEY="your-api-key-here"
```

## Commands

### Authentication
```bash
# Login to both platforms (saves cookies for future use)
npm run command login

# Check login status
npm run command status

# Clear saved cookies
npm run command logout

# Open browser with authenticated sessions
npm run command browser
```

### Post Collection & Analysis

```bash
# Gather posts from both Twitter and LinkedIn (NEW!)
# This command captures screenshots, analyzes them with AI, and saves to database
npm run command gather-posts --count 20

# Gather posts with custom categories
npm run command gather-posts --count 10 --categories ./my-categories.json

# Capture screenshots from Twitter only
npm run command twitter-screenshots 10 ./screenshots/twitter

# Capture screenshots from LinkedIn only  
npm run command linkedin-screenshots 10 ./screenshots/linkedin
```

### Database Management

```bash
# List posts from database (NEW!)
npm run command list-posts --count 20

# List posts from custom database location
npm run command list-posts --count 10 --db-path ./my-posts.json

# Rate a specific post (NEW!)
npm run command rate-post "post_id_here" 4

# Rate a post in custom database
npm run command rate-post "post_id_here" 5 --db-path ./my-posts.json
```

### Individual Post Analysis

```bash
# Analyze a single image
npm run command review-post ./path/to/image.png

# Analyze with custom categories
npm run command review-post ./path/to/image.png --categories ./my-categories.json
```

## New Enhanced Features

### Improved Post Deduplication

The system now uses multiple methods to prevent duplicate posts:

1. **Platform Unique IDs**: Uses tweet IDs, LinkedIn activity IDs for reliable identification
2. **Content Hashing**: SHA-256 hash of image content to detect same content across platforms
3. **Legacy Description+URL**: Fallback method for compatibility

### Unified Post Collection

The new `gather-posts` command:
- Captures screenshots from both Twitter and LinkedIn
- Analyzes each post with AI to generate descriptions
- Automatically stores posts in the database with ratings
- Provides detailed results and error reporting
- Handles authentication automatically

### Database Features

- **Enhanced Post Storage**: Includes platform info, unique IDs, content hashes, and local screenshot paths
- **Rating System**: Rate posts 1-5 stars to build preference data
- **Browse & List**: Easy browsing of collected posts with filtering
- **Duplicate Prevention**: Smart deduplication across multiple collection sessions

## Category Configuration

Create a JSON file with your preferred categories:

```json
[
  {
    "name": "AI Coding",
    "overview": "Posts about AI coding tools and frameworks",
    "likedExamples": [
      "New AI coding assistant features",
      "AI debugging tools"
    ],
    "dislikedExamples": [
      "Basic programming tutorials",
      "Non-AI coding content"
    ]
  }
]
```

## File Structure

```
~/.attn/                   # Default storage location
  screenshots/             # Screenshot storage
    twitter/               # Twitter screenshots
    linkedin/              # LinkedIn screenshots
  posts.json              # Post database (auto-created)
./twitter-cookies.json     # Saved Twitter session (in project directory)
./linkedin-cookies.json    # Saved LinkedIn session (in project directory)
```

## Example Workflow

1. **Initial Setup**:
   ```bash
   npm run command login
   ```

2. **Collect Posts**:
   ```bash
   npm run command gather-posts --count 20
   ```

3. **Browse Collected Posts**:
   ```bash
   npm run command list-posts --count 10
   ```

4. **Rate Interesting Posts**:
   ```bash
   npm run command rate-post "twitter_1234567890_1234567890" 5
   npm run command rate-post "linkedin_9876543210_1234567890" 3
   ```

5. **Collect More Posts**:
   ```bash
   npm run command gather-posts --count 10
   # Duplicates will be automatically skipped
   ```