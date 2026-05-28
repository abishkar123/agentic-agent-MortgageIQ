import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { knowledgeBase } from '../data/knowledge'

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'with', 'this', 'that',
  'have', 'from', 'what', 'will', 'your', 'which', 'when', 'there', 'they', 'been', 'their',
  'than', 'then', 'into', 'more', 'also', 'some', 'over', 'such', 'even', 'most', 'after',
  'about', 'would', 'could', 'very', 'just', 'like', 'make', 'know', 'take', 'year', 'good',
  'much', 'get', 'one', 'our', 'out', 'its', 'has', 'was', 'his', 'her', 'how', 'any',
])

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s%$&]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

function scoreEntry(
  entry: (typeof knowledgeBase)[0],
  queryKeywords: string[],
  rawQuery: string,
): number {
  const lowerQuery = rawQuery.toLowerCase()
  const entryKeywordSet = new Set(entry.keywords)
  let score = 0

  for (const kw of queryKeywords) {
    // Exact match against defined keyword list (highest weight)
    if (entryKeywordSet.has(kw)) score += 4
    // Keyword list contains a phrase that includes this word
    for (const ek of entryKeywordSet) {
      if (ek.includes(kw) && ek !== kw) score += 2
    }
    // Match in title
    if (entry.title.toLowerCase().includes(kw)) score += 3
    // Match in content body
    if (entry.content.toLowerCase().includes(kw)) score += 1
  }

  // Boost for multi-word phrase matches against the raw query
  for (const ek of entryKeywordSet) {
    if (ek.length > 6 && lowerQuery.includes(ek)) score += 5
  }

  return score
}

export const knowledgeSearchTool = createTool({
  id: 'knowledge_search',
  description:
    'Search the Mortgage House knowledge base for product information, eligibility guides, FAQs, key mortgage concepts, and process information.',
  inputSchema: z.object({
    query: z.string().describe('The user question to search for'),
    topK: z.number().optional().default(3).describe('Number of results to return'),
  }),
  execute: async (inputData) => {
    const queryKeywords = extractKeywords(inputData.query)
    const topK = inputData.topK ?? 3

    const MIN_SCORE = 3

    const scored = knowledgeBase
      .map((entry) => ({ entry, score: scoreEntry(entry, queryKeywords, inputData.query) }))
      .filter(({ score }) => score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    if (scored.length === 0) {
      return {
        results: [
          {
            title: 'Topic not found in knowledge base',
            content:
              'No specific information was found for this topic. For personalised advice, please call Mortgage House on 133 144 or visit mortgagehouse.com.au.',
            category: 'faq',
          },
        ],
      }
    }

    return {
      results: scored.map(({ entry, score: _ }) => ({
        title: entry.title,
        content: entry.content,
        category: entry.category,
      })),
    }
  },
})
