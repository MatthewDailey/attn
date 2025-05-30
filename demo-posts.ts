import { PostDB } from './post-db.js'

const db = new PostDB()

// Sample posts for demo
const samplePosts = [
  {
    description:
      '🚀 Just shipped a new React component library! TypeScript + styled-components + Storybook. The developer experience is incredible. Check out the documentation and let me know what you think!',
    screenshotPath: '/dev/null', // placeholder path
    platform: 'twitter',
    category: 'Programming and AI Memes',
  },
  {
    description:
      "Mind = blown 🤯 This new AI coding assistant just wrote an entire REST API in 30 seconds. The future of software development is here and it's wild!",
    screenshotPath: '/dev/null',
    platform: 'linkedin',
    category: 'AI Coding',
  },
  {
    description:
      "Hot take: CSS Grid > Flexbox for 90% of layout needs. Fight me in the comments 😄 Here's why I think Grid should be your go-to layout tool...",
    screenshotPath: '/dev/null',
    platform: 'twitter',
    category: 'Programming and AI Memes',
  },
  {
    description:
      'Just spent 3 hours debugging only to find out I had a missing semicolon. Sometimes I wonder why I chose this career path 😅 #developerlife',
    screenshotPath: '/dev/null',
    platform: 'twitter',
    category: 'Programming and AI Memes',
  },
  {
    description:
      'Built my first neural network from scratch today using NumPy. It can recognize handwritten digits with 94% accuracy! The math behind backpropagation finally clicked. 🧠✨',
    screenshotPath: '/dev/null',
    platform: 'linkedin',
    category: 'AI Coding',
  },
  {
    description:
      "When your code works on the first try but you don't trust it so you spend another hour looking for bugs that don't exist 👀",
    screenshotPath: '/dev/null',
    platform: 'twitter',
    category: 'Programming and AI Memes',
  },
  {
    description:
      'Exploring the new features in Next.js 15. The app router is a game changer for React applications. Server components + streaming = 🔥',
    screenshotPath: '/dev/null',
    platform: 'linkedin',
    category: 'AI Coding',
  },
  {
    description:
      'me: *writes perfectly clean, documented code*\nme 6 months later: *stares at the same code* who wrote this garbage?? 🤔',
    screenshotPath: '/dev/null',
    platform: 'twitter',
    category: 'Programming and AI Memes',
  },
  {
    description:
      "Deployed my first machine learning model to production today! It's a recommendation system that suggests coding resources based on GitHub activity. 95% uptime so far 📈",
    screenshotPath: '/dev/null',
    platform: 'linkedin',
    category: 'AI Coding',
  },
  {
    description:
      'CSS tip: Use `clamp()` for responsive typography. No more media queries for font sizes! clamp(1rem, 2.5vw, 2rem) gives you fluid scaling between 1rem and 2rem 💡',
    screenshotPath: '/dev/null',
    platform: 'twitter',
    category: 'Programming and AI Memes',
  },
]

console.log('Adding sample posts to the database...')

samplePosts.forEach((post, index) => {
  const postId = db.addPost(
    post.description,
    post.screenshotPath,
    null, // no rating initially
    post.platform,
    undefined, // originalPostId
    `demo_${post.platform}_${index}`, // platformUniqueId
    undefined, // contentHash
    post.category,
  )

  if (postId) {
    console.log(`✓ Added post ${index + 1}: ${postId}`)
  } else {
    console.log(`✗ Failed to add post ${index + 1} (might already exist)`)
  }
})

const stats = db.getStats()
console.log('\nDatabase stats:')
console.log(`Total posts: ${stats.totalPosts}`)
console.log(`Platforms: ${Object.keys(stats.platformBreakdown).join(', ')}`)
console.log(`Categories: ${Object.keys(stats.categoryBreakdown).join(', ')}`)

console.log('\nDemo data setup complete! You can now run the web app.')
console.log('Run: npm run dev')
