import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export interface Category {
  name: string
  overview: string
  likedExamples: string[]
  dislikedExamples: string[]
}

export interface ReviewResult {
  description: string
  categoryName: string | null
}

const reviewResultSchema = z.object({
  description: z.string().describe('A detailed description of the social media post content'),
  categoryName: z
    .string()
    .nullable()
    .describe('The name of the matching category, or null if no category matches'),
})

export async function reviewSocialPost(
  pathToImage: string,
  categories: Category[],
): Promise<ReviewResult> {
  try {
    // Read the image file
    const imagePath = resolve(pathToImage)
    const imageBuffer = readFileSync(imagePath)
    const imageBase64 = imageBuffer.toString('base64')
    const imageMimeType = getImageMimeType(pathToImage)

    // Build the prompt with category information and examples
    const categoryPrompts = categories
      .map((category) => {
        const likedExamplesText =
          category.likedExamples.length > 0
            ? `\nExamples of posts the user LIKES in this category:\n${category.likedExamples.map((ex) => `- ${ex}`).join('\n')}`
            : ''

        const dislikedExamplesText =
          category.dislikedExamples.length > 0
            ? `\nExamples of posts the user DISLIKES in this category:\n${category.dislikedExamples.map((ex) => `- ${ex}`).join('\n')}`
            : ''

        return `**${category.name}**: ${category.overview}${likedExamplesText}${dislikedExamplesText}`
      })
      .join('\n\n')

    const prompt = `You are analyzing a social media post image to provide a description and determine if it matches any of the user's defined categories.

Available Categories:
${categoryPrompts}

Instructions:
1. Analyze the image and provide a detailed description of the post content, including text, visual elements, and overall message.
2. Based on the description and the user's liked/disliked examples, determine if this post matches any of the defined categories.
3. If it matches a category well (considering the user's preferences shown in the examples), return that category name.
4. If it doesn't clearly match any category or the user would likely dislike it based on the examples, return null for categoryName.

Please analyze the image and provide your response.`

    const result = await generateObject({
      model: google('gemini-2.0-flash'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image',
              image: `data:${imageMimeType};base64,${imageBase64}`,
            },
          ],
        },
      ],
      schema: reviewResultSchema,
    })

    return result.object
  } catch (error) {
    console.error('Error reviewing social post:', error)
    throw new Error(
      `Failed to review social post: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

function getImageMimeType(filePath: string): string {
  const extension = filePath.toLowerCase().split('.').pop()
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    default:
      return 'image/jpeg' // Default fallback
  }
}
