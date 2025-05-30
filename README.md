# Attn

An agent to protect your attention by helping you browse and rate social media posts with AI-powered categorization.

## Overview

Attn gathers posts from Twitter and LinkedIn, takes screenshots, categorizes them using AI, and provides a web interface to browse and rate them. It helps you be more intentional about your social media consumption.

## Prerequisites

- Node.js (v18 or higher)
- Chrome/Chromium browser

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Required for AI categorization
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here

# Required for ngrok tunneling (get from ngrok.com)
NGROK_AUTHTOKEN=your_ngrok_token_here
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Login to Social Platforms

```bash
npm run cli login
```

This will open browser windows for you to login to Twitter and LinkedIn. Your login sessions will be saved for future use.

### 3. Gather Posts

```bash
npm run cli -- gather-posts --num 20
```

This will:
- Gather 20 posts from both Twitter and LinkedIn
- Take screenshots of each post
- Categorize posts using AI
- Store everything in a local database

### 4. Start the Application

```bash
npm start
```

This starts:
- Backend API server on port 8080
- Frontend web app on port 3000
- Ngrok tunnel for external access

Visit http://localhost:3000 to browse and rate your posts.

## CLI Commands

```bash
# Check login status
npm run cli -- status

# Gather posts (default: 10 from each platform)
npm run gather

# Gather specific number of posts
npm run gather -- --num 50

# List posts in database
npm run cli -- list-posts

# Clear all posts
npm run cli -- clear-posts --confirm

# Logout from all platforms
npm run cli -- logout
```

## Data Storage

Posts and screenshots are stored in `~/.attn/`:
```
~/.attn/
├── posts.json              # Post database
├── screenshots/            # Post screenshots
│   ├── twitter/
│   └── linkedin/
└── categories.json         # AI categories (optional)
```
