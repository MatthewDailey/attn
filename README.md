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

## Social Media Automation

This project includes functionality for automating interactions with social media platforms like Twitter and LinkedIn using Puppeteer.

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

3. **Check login status**:
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

## Deploy with Render 

Create a project and connect the Github repo on [Render](https://render.com/)

## Deploy with Railway

Create a project and service in [Railway](https://railway.com/) and link it to this project.
```
railway link
npm run deploy 
```

Alternately, link the service to the Github repo for `main` to be automatically deployed.