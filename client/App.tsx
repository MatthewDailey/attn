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
        const response = await fetch(`/api/posts?pageSize=10&offset=${offset}`)
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
    [loading],
  )

  // Load initial posts and current position
  useEffect(() => {
    fetchPosts()
  }, [])

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

  return (
    <div className="app">
      <header className="header">
        <h1>Social Media Feed</h1>
        <div className="stats">
          <span>
            Position: {currentIndex + 1} / {totalPosts}
          </span>
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
                <span className="platform">{post.platform || 'Unknown'}</span>
                <span className="timestamp">{formatTimestamp(post.timestamp)}</span>
                {post.category && <span className="category">{post.category}</span>}
              </div>
            </div>

            <div className="post-content">
              <p className="description">{post.description}</p>
              {post.screenshotPath && (
                <img
                  src={`/api/screenshots/${encodeURIComponent(post.screenshotPath)}`}
                  alt="Post screenshot"
                  className="screenshot"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              )}
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
