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

interface PaginatedResult {
  posts: Post[]
  currentIndex: number
  totalPosts: number
  hasMore: boolean
  hasPrevious: boolean
}

function App() {
  const [posts, setPosts] = useState<Post[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalPosts, setTotalPosts] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)
  const topLoadingRef = useRef<HTMLDivElement>(null)

  // Fetch posts with offset from current position
  const fetchPosts = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      if (loading) return

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          pageSize: '10',
          offset: offset.toString(),
        })

        if (selectedCategory !== 'all') {
          params.append('category', selectedCategory)
        }

        if (selectedPlatform !== 'all') {
          params.append('platform', selectedPlatform)
        }

        const response = await fetch(`/api/posts?${params}`)
        if (!response.ok) throw new Error('Failed to fetch posts')

        const result: PaginatedResult = await response.json()

        if (append) {
          setPosts((prev) => (offset > 0 ? [...prev, ...result.posts] : [...result.posts, ...prev]))
        } else {
          setPosts(result.posts)
        }

        setCurrentIndex(result.currentIndex)
        setTotalPosts(result.totalPosts)
        setHasMore(result.hasMore)
        setHasPrevious(result.hasPrevious)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts')
      } finally {
        setLoading(false)
      }
    },
    [loading, selectedCategory, selectedPlatform],
  )

  // Fetch available filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/posts/filters')
      if (response.ok) {
        const filters = await response.json()
        setAvailableCategories(filters.categories || [])
        setAvailablePlatforms(filters.platforms || [])
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err)
    }
  }, [])

  // Load initial posts and current position
  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  useEffect(() => {
    // Reset pagination when filters change
    setCurrentIndex(0)
    setPosts([])
    fetchPosts()
  }, [selectedCategory, selectedPlatform])

  // Update post rating
  const updateRating = useCallback(async (postId: string, rating: number) => {
    try {
      const response = await fetch(`/api/posts/${postId}/rating`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })

      if (!response.ok) throw new Error('Failed to update rating')

      // Update local state
      setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, rating } : post)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rating')
    }
  }, [])

  // Handle filter changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
  }

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform)
  }

  // Set up intersection observers for infinite scroll
  useEffect(() => {
    const currentLoadingRef = loadingRef.current
    const currentTopLoadingRef = topLoadingRef.current

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loading) {
            if (entry.target === currentLoadingRef && hasMore) {
              // Load more posts at the bottom
              fetchPosts(posts.length, true)
            } else if (entry.target === currentTopLoadingRef && hasPrevious) {
              // Load previous posts at the top
              fetchPosts(-posts.length, true)
            }
          }
        })
      },
      { threshold: 0.1 },
    )

    if (currentLoadingRef) {
      observerRef.current.observe(currentLoadingRef)
    }
    if (currentTopLoadingRef) {
      observerRef.current.observe(currentTopLoadingRef)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [fetchPosts, hasMore, hasPrevious, loading, posts.length])

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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getRatingColor = (rating: number | null) => {
    if (rating === 1) return '#10b981' // green
    if (rating === -1) return '#ef4444' // red
    return '#6b7280' // gray
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

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">attn:</h1>
          <div className="filters">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
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
              onChange={(e) => handlePlatformChange(e.target.value)}
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
        {hasPrevious && (
          <div ref={topLoadingRef} className="loading-indicator">
            {loading ? 'Loading previous posts...' : 'Scroll up for more'}
          </div>
        )}

        {posts.map((post) => (
          <div key={post.id} className="post">
            <div className="post-header">
              <div className="post-meta">
                <div className="platform">{getPlatformIcon(post.platform || 'default')}</div>
                <span className="timestamp">{formatTimestamp(post.timestamp)}</span>
                {post.category && <span className="category">{post.category}</span>}
              </div>
              <div className="post-actions">
                <button
                  className={`rating-btn thumbs-up ${post.rating === 1 ? 'active' : ''}`}
                  onClick={() => updateRating(post.id, 1)}
                  style={{ color: post.rating === 1 ? getRatingColor(1) : undefined }}
                >
                  👍
                </button>
                <span className="rating-display">
                  {post.rating === 1 ? '👍' : post.rating === -1 ? '👎' : '—'}
                </span>
                <button
                  className={`rating-btn thumbs-down ${post.rating === -1 ? 'active' : ''}`}
                  onClick={() => updateRating(post.id, -1)}
                  style={{ color: post.rating === -1 ? getRatingColor(-1) : undefined }}
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

        {hasMore && (
          <div ref={loadingRef} className="loading-indicator">
            {loading ? 'Loading more posts...' : 'Scroll down for more'}
          </div>
        )}

        {!hasMore && !hasPrevious && posts.length === 0 && (
          <div className="empty-state">
            <p>No posts available. Start gathering some social media posts!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
