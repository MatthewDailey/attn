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

3. **Review social media posts with AI**:
   ```bash
   npm run cli review-post ./path/to/image.png
   npm run cli review-post ./screenshot.jpg --categories ./my-categories.json
   ```

4. **Check login status**:
   ```bash
   npm run cli status
   ```

### Twitter Screenshot Capture

The `scrollAndGatherTwitter` function allows you to automatically scroll through Twitter's home page and capture screenshots of individual posts.

#### CLI Usage (Recommended)

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

#### Programmatic Usage

```typescript
import { SocialAuth } from './social-auth.js'
import { scrollAndGatherTwitter } from './twitter-utils.js'

const socialAuth = new SocialAuth()
const pages = await socialAuth.startBrowser()

await pages.withTwitter(async (page) => {
  await scrollAndGatherTwitter(page, './screenshots', 10)
})
```

#### Parameters

- `count`: Number of posts to capture screenshots of (default: 10)
- `directory`: Directory path where screenshots will be saved (default: './twitter-screenshots')

#### Features

- 📸 Automatically captures screenshots of individual Twitter posts
- 🔄 Scrolls through the feed to find more posts
- 🎯 Avoids duplicate captures using unique post identifiers
- 📁 Creates output directory if it doesn't exist
- ⚡ Includes fallback method for different Twitter layouts
- 🛡️ Error handling and retry logic
- 🔐 Uses existing authentication system (no manual login required)
- 📖 **Auto-expands truncated content** - Automatically clicks "Show More" links to capture full tweets

#### Requirements

- You must be logged into Twitter using `npm run cli login`
- The authentication system will handle cookies and session management

### Available CLI Commands

```bash
npm run cli login                    # Login to Twitter and LinkedIn
npm run cli status                   # Check current login status
npm run cli logout                   # Clear saved authentication
npm run cli browser                  # Start authenticated browser session
npm run cli twitter-screenshots     # Capture Twitter post screenshots
npm run cli review-post <imagePath>  # Analyze social media post with AI
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