import React, { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

interface Post {
  id: string
  description: string
  timestamp: string
  rating: number | null
  platform?: string
  originalPostId?: string
  platformUniqueId?: string
  contentHash?: string
  screenshotPath: string
  category?: string
}

function App() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')

  // Fetch all posts on component mount
  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/posts')
      if (!response.ok) throw new Error('Failed to fetch posts')

      const posts: Post[] = await response.json()
      setPosts(posts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load posts on mount
  useEffect(() => {
    fetchPosts()
  }, [])

  // Update post rating
  const updateRating = useCallback(
    async (postId: string, rating: number) => {
      const currentPost = posts.find((post) => post.id === postId)
      const newRating = currentPost?.rating === rating ? null : rating

      try {
        const response = await fetch(`/api/posts/${postId}/rating`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: newRating }),
        })

        if (!response.ok) throw new Error('Failed to update rating')

        // Update local state
        setPosts((prev) =>
          prev.map((post) => (post.id === postId ? { ...post, rating: newRating } : post)),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update rating')
      }
    },
    [posts],
  )

  // Save scroll position before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem('feedScrollPosition', window.pageYOffset.toString())
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Restore scroll position on load
  useEffect(() => {
    const savedPosition = localStorage.getItem('feedScrollPosition')
    if (savedPosition && posts.length > 0) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition))
        localStorage.removeItem('feedScrollPosition')
      }, 100)
    }
  }, [posts.length])

  const filterPosts = (category: string, platform: string) => {
    let result = posts
    if (category !== 'all') {
      result = result.filter((post) => post.category === category)
    }
    if (platform !== 'all') {
      result = result.filter((post) => post.platform === platform)
    }
    return result
  }

  const availableCategories = [
    ...new Set(
      posts.map((post) => post.category).filter((category): category is string => !!category),
    ),
  ]

  const availablePlatforms = [
    ...new Set(
      posts.map((post) => post.platform).filter((platform): platform is string => !!platform),
    ),
  ]

  if (loading) {
    return (
      <div className="app">
        <div className="loading-indicator">Loading posts...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">attn:</h1>
          <div className="filters">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-dropdown"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="filter-dropdown"
            >
              <option value="all">All Platforms</option>
              {availablePlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {error && (
        <div className="error">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="feed">
        {filterPosts(selectedCategory, selectedPlatform).map((post) => (
          <div key={post.id} className={`post ${post.rating === -1 ? 'post-thumbs-down' : ''}`}>
            <div className="post-header">
              <div className="post-meta">
                <div className="platform">{getPlatformIcon(post.platform || 'default')}</div>
                <span className="timestamp">{formatTimestamp(post.timestamp)}</span>
                {post.category && (
                  <span
                    className="category-badge"
                    style={{
                      backgroundColor: getCategoryColor(post.category),
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      marginLeft: '8px',
                    }}
                  >
                    {post.category}
                  </span>
                )}
              </div>
              <div className="post-actions">
                <button
                  className={`rating-btn thumbs-up ${post.rating === 1 ? 'active' : post.rating === -1 ? 'inactive' : ''}`}
                  onClick={() => updateRating(post.id, 1)}
                >
                  👍
                </button>
                <button
                  className={`rating-btn thumbs-down ${post.rating === -1 ? 'active' : post.rating === 1 ? 'inactive' : ''}`}
                  onClick={() => updateRating(post.id, -1)}
                >
                  👎
                </button>
              </div>
            </div>

            <div className="post-content">
              {post.screenshotPath ? (
                <img
                  src={`/api/screenshots/${encodeURIComponent(post.screenshotPath)}`}
                  alt="Post screenshot"
                  className="screenshot"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    // Show description as fallback when screenshot fails to load
                    const fallbackDiv = document.createElement('div')
                    fallbackDiv.className = 'description fallback'
                    fallbackDiv.textContent = post.description
                    target.parentNode?.appendChild(fallbackDiv)
                  }}
                />
              ) : (
                <p className="description fallback">
                  No screenshot available. Original text: {post.description}
                </p>
              )}
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="empty-state">
            <p>No posts available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

// Helper function to generate consistent colors for categories
const getCategoryColor = (category: string) => {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // orange
    '#EC4899', // pink
    '#6366F1', // indigo
  ]

  // Simple hash function to consistently map category names to colors
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const getPlatformIcon = (platform: string) => {
  // Platform icon mapping - replace with actual SVG icons
  const iconMap: { [key: string]: React.ReactElement } = {
    twitter: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        x="0px"
        y="0px"
        width="100"
        height="100"
        viewBox="0 0 50 50"
      >
        <path d="M 5.9199219 6 L 20.582031 27.375 L 6.2304688 44 L 9.4101562 44 L 21.986328 29.421875 L 31.986328 44 L 44 44 L 28.681641 21.669922 L 42.199219 6 L 39.029297 6 L 27.275391 19.617188 L 17.933594 6 L 5.9199219 6 z M 9.7167969 8 L 16.880859 8 L 40.203125 42 L 33.039062 42 L 9.7167969 8 z"></path>
      </svg>
    ),
    linkedin: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        x="0px"
        y="0px"
        width="100"
        height="100"
        viewBox="0 0 48 48"
      >
        <path
          fill="#0288D1"
          d="M42,37c0,2.762-2.238,5-5,5H11c-2.761,0-5-2.238-5-5V11c0-2.762,2.239-5,5-5h26c2.762,0,5,2.238,5,5V37z"
        ></path>
        <path
          fill="#FFF"
          d="M12 19H17V36H12zM14.485 17h-.028C12.965 17 12 15.888 12 14.499 12 13.08 12.995 12 14.514 12c1.521 0 2.458 1.08 2.486 2.499C17 15.887 16.035 17 14.485 17zM36 36h-5v-9.099c0-2.198-1.225-3.698-3.192-3.698-1.501 0-2.313 1.012-2.707 1.99C24.957 25.543 25 26.511 25 27v9h-5V19h5v2.616C25.721 20.5 26.85 19 29.738 19c3.578 0 6.261 2.25 6.261 7.274L36 36 36 36z"
        ></path>
      </svg>
    ),
    facebook: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        {/* Facebook icon stub - replace with actual SVG path */}
        <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 5.16-1 9-5.45 9-11V7l-10-5z" />
      </svg>
    ),
    instagram: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        {/* Instagram icon stub - replace with actual SVG path */}
        <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 5.16-1 9-5.45 9-11V7l-10-5z" />
      </svg>
    ),
    reddit: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        {/* Reddit icon stub - replace with actual SVG path */}
        <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 5.16-1 9-5.45 9-11V7l-10-5z" />
      </svg>
    ),
    default: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        {/* Default icon stub */}
        <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 5.16-1 9-5.45 9-11V7l-10-5z" />
      </svg>
    ),
  }
  return iconMap[platform?.toLowerCase()] || iconMap['default']
}

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString()
}

const getRatingColor = (rating: number | null) => {
  if (rating === 1) return '#10b981' // green
  if (rating === -1) return '#ef4444' // red
  return '#6b7280' // gray
}
