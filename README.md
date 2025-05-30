# Social Media Feed Application

A modern web application for browsing and rating social media posts with infinite scroll, persistent position, and category-based filtering.

## Features

### 🎯 Feed Interface
- **Infinite Scroll**: Seamlessly browse posts with automatic loading
- **Bidirectional Navigation**: Scroll up to load previous posts, down for newer ones
- **Persistent Position**: Maintains your position when refreshing the page
- **Rating System**: Thumbs up/down rating for each post with instant feedback
- **Modern UI**: Clean, responsive design optimized for mobile and desktop

### 📊 Post Management
- **Category-Based Filtering**: AI-categorized posts for better organization
- **Platform Support**: Twitter, LinkedIn, and other social media platforms
- **Screenshot Integration**: View original post screenshots
- **Metadata Display**: Platform, timestamp, and category information

### 🔧 Technical Features
- **Real-time Updates**: Rating changes are immediately reflected in the UI
- **Error Handling**: Graceful error handling with user-friendly messages
- **Performance Optimized**: Efficient pagination and lazy loading
- **TypeScript**: Full type safety throughout the application

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Add Sample Data
```bash
npm run demo
```

### 3. Start the Application
```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000 (Vite dev server)
- **Backend API**: http://localhost:8080

## API Endpoints

### Posts
- `GET /api/posts?pageSize=10&offset=0` - Get paginated posts around current position
- `GET /api/posts/:postId` - Get specific post by ID
- `PUT /api/posts/:postId/rating` - Update post rating (1 for thumbs up, -1 for thumbs down)

### Position Management
- `GET /api/position` - Get current position in the feed
- `PUT /api/position` - Update current position

### Utilities
- `GET /api/stats` - Get database statistics
- `GET /api/screenshots/*` - Serve screenshot images
- `GET /api/ping` - Health check

## Usage

### Browsing Posts
1. **Scroll Down**: Load newer posts automatically
2. **Scroll Up**: Load previous posts when available
3. **Rate Posts**: Click 👍 or 👎 to rate posts
4. **View Details**: See platform, timestamp, and category for each post

### Rating System
- **👍 Thumbs Up**: Rate post positively (value: 1)
- **👎 Thumbs Down**: Rate post negatively (value: -1)
- **No Rating**: Posts start unrated (value: null)

### Persistent Experience
- Your scroll position is saved when you refresh the page
- The application remembers where you left off in the feed
- Ratings are immediately saved to the database

## Development

### Project Structure
```
├── client/           # React frontend
│   ├── App.tsx      # Main feed component
│   ├── App.css      # Styling
│   └── main.tsx     # Entry point
├── server/          # Express backend
│   ├── app.ts       # API routes and middleware
│   └── index.ts     # Server startup
├── post-db.ts       # Database layer
├── demo-posts.ts    # Sample data generator
└── vite.config.ts   # Build configuration
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run demo` - Add sample posts to database
- `npm run test` - Run tests
- `npm run format` - Format code with Prettier

### Adding Real Data
To add real social media posts, use the existing post gathering tools:
```bash
npm run cli
```

## Database Schema

### Post Interface
```typescript
interface Post {
  id: string
  description: string
  timestamp: Date
  rating: number | null  // 1, -1, or null
  platform?: string     // 'twitter', 'linkedin', etc.
  originalPostId?: string
  platformUniqueId?: string
  contentHash?: string
  screenshotPath: string
  category?: string      // AI-assigned category
}
```

### Pagination Response
```typescript
interface PaginatedResult {
  posts: Post[]
  currentIndex: number
  totalPosts: number
  hasMore: boolean
  hasPrevious: boolean
}
```

## Configuration

### Environment Variables
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment mode (development/production)

### Database Location
Posts are stored in `~/.attn/posts.json` by default.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run `npm run format` and `npm run check`
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

## Recent Updates

### Feed Interface (Latest)
- ✅ Complete React frontend with infinite scroll
- ✅ Thumbs up/down rating system
- ✅ Persistent scroll position
- ✅ Responsive design for mobile and desktop
- ✅ Real-time rating updates
- ✅ Error handling and loading states

### API Enhancements
- ✅ RESTful API for post management
- ✅ Position tracking and updates
- ✅ Image serving for screenshots
- ✅ Comprehensive error handling
- ✅ CORS support for development

### Category System
- ✅ AI-based post categorization
- ✅ Category filtering and statistics
- ✅ Enhanced database schema
- ✅ Backward compatibility

For detailed information about category features, see [CATEGORY_CHANGES.md](CATEGORY_CHANGES.md).