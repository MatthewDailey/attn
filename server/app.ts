/**
 * @fileoverview Sets up an Express server with CORS, JSON parsing, and a ping endpoint. Serves either the Vite development server or static production files.
 */

import express from 'express'
import cors from 'cors'
import { createServer as createViteServer } from 'vite'
import { PostDB } from '../post-db.js'
import path from 'path'
import fs from 'fs'

export async function createApp() {
  const app = express()
  const isDev = process.env.NODE_ENV !== 'production'
  console.log('isDev', isDev)

  // Initialize PostDB
  const postDB = new PostDB(process.env.ATTN_DB_PATH)

  app.use(
    '/api',
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  app.use(express.json())

  app.get('/api/ping', (req, res) => {
    console.log('Received ping.')
    return res.send('pong')
  })

  // Get all posts
  app.get('/api/posts', (req, res) => {
    try {
      // Get all posts by using a very large page size and 0 offset
      const result = postDB.getPosts(10000, 0)
      // Return just the posts array instead of pagination metadata
      res.json(result.posts)
    } catch (error) {
      console.error('Error getting posts:', error)
      res.status(500).json({ error: 'Failed to get posts' })
    }
  })

  // Get current position
  app.get('/api/position', (req, res) => {
    try {
      const position = postDB.getCurrentPosition()
      res.json(position)
    } catch (error) {
      console.error('Error getting position:', error)
      res.status(500).json({ error: 'Failed to get position' })
    }
  })

  // Update current position
  app.put('/api/position', (req, res) => {
    try {
      const { index } = req.body
      if (typeof index !== 'number') {
        return res.status(400).json({ error: 'Index must be a number' })
      }

      const success = postDB.goToIndex(index)
      if (success) {
        res.json({ success: true, currentIndex: index })
      } else {
        res.status(400).json({ error: 'Invalid index' })
      }
    } catch (error) {
      console.error('Error updating position:', error)
      res.status(500).json({ error: 'Failed to update position' })
    }
  })

  // Update post rating
  app.put('/api/posts/:postId/rating', (req, res) => {
    try {
      const { postId } = req.params
      const { rating } = req.body

      if (
        rating &&
        (typeof rating !== 'number' || (rating !== 1 && rating !== -1 && rating !== 0))
      ) {
        return res
          .status(400)
          .json({ error: `Rating must be 1 (thumbs up) or -1 (thumbs down) rating = ${rating}` })
      }

      const success = postDB.updateRating(postId, rating)
      if (success) {
        res.json({ success: true })
      } else {
        res.status(404).json({ error: 'Post not found' })
      }
    } catch (error) {
      console.error('Error updating rating:', error)
      res.status(500).json({ error: 'Failed to update rating' })
    }
  })

  // Get specific post by ID
  app.get('/api/posts/:postId', (req, res) => {
    try {
      const { postId } = req.params
      const post = postDB.getPost(postId)

      if (post) {
        res.json(post)
      } else {
        res.status(404).json({ error: 'Post not found' })
      }
    } catch (error) {
      console.error('Error getting post:', error)
      res.status(500).json({ error: 'Failed to get post' })
    }
  })

  // Serve screenshot images
  app.get('/api/screenshots/*', (req, res) => {
    try {
      // Decode the URL-encoded path
      const imagePath = decodeURIComponent(req.url.replace('/api/screenshots/', ''))

      // Handle different types of paths
      let fullPath: string

      if (path.isAbsolute(imagePath)) {
        // If it's already an absolute path, use it directly
        fullPath = imagePath
      } else {
        // If it's a relative path, resolve it from the current working directory
        fullPath = path.resolve(imagePath)
      }

      // Security check - ensure the file exists and is readable
      if (!fs.existsSync(fullPath)) {
        console.log(`Screenshot not found: ${fullPath}`)
        return res.status(404).json({ error: 'Screenshot not found', path: imagePath })
      }

      // Additional security check - ensure it's an image file
      const ext = path.extname(fullPath).toLowerCase()
      if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
        console.log(`Invalid file type requested: ${fullPath}`)
        return res.status(400).json({ error: 'Invalid file type' })
      }

      // Set appropriate content type
      const contentType =
        ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.gif'
              ? 'image/gif'
              : ext === '.webp'
                ? 'image/webp'
                : 'image/png'

      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'public, max-age=3600') // Cache for 1 hour

      res.sendFile(fullPath)
    } catch (error) {
      console.error('Error serving screenshot:', error)
      res.status(500).json({ error: 'Failed to serve screenshot' })
    }
  })

  // Get database stats
  app.get('/api/stats', (req, res) => {
    try {
      const stats = postDB.getStats()
      res.json(stats)
    } catch (error) {
      console.error('Error getting stats:', error)
      res.status(500).json({ error: 'Failed to get stats' })
    }
  })

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
    app.get('*', (req, res, next) => {
      if (!req.url.startsWith('/api')) {
        vite.middlewares(req, res, next)
      } else {
        next()
      }
    })
  } else {
    app.use(express.static('dist'))
    app.get('*', (req, res) => {
      res.sendFile('index.html', { root: './dist' })
    })
  }

  return app
}
