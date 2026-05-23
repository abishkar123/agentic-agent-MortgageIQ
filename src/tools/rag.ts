import { createTool } from '@mastra/core/tools'
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers'
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'
import { existsSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'

const DB_PATH = '../mortgageiq-ts/hnswlib_db'

let _store: HNSWLib | null = null
let _embeddings: HuggingFaceTransformersEmbeddings | null = null

interface SearchDocument {
  pageContent: string
  metadata: Record<string, unknown>
}

async function getStore(): Promise<HNSWLib> {
  if (!_store) {
    const argsPath = join(DB_PATH, 'args.json')
    if (!existsSync(argsPath)) {
      throw new Error(
        `MortgageIQ knowledge base is not available. Expected vector store file at ${argsPath}. Run "cd ../mortgageiq-ts && npm run ingest" or update DB_PATH in src/tools/rag.ts.`
      )
    }

    _embeddings = new HuggingFaceTransformersEmbeddings({
      model: 'Xenova/all-MiniLM-L6-v2',
    })
    _store = await HNSWLib.load(DB_PATH, _embeddings)
  }
  return _store
}

async function getEmbeddings(): Promise<HuggingFaceTransformersEmbeddings> {
  if (!_embeddings) {
    await getStore()
  }
  return _embeddings!
}

export const ragSearchTool = createTool({
  id: 'rag_search',
  description:
    'Search the Mortgage House knowledge base for product information, FAQs, eligibility guides, and policy documents.',
  inputSchema: z.object({
    query: z.string().describe('The user question to search for'),
    topK: z.number().optional().default(4).describe('Number of results to return'),
  }),
  execute: async ({ context }) => {
    try {
      const store = await getStore()
      const embeddings = await getEmbeddings()
      const queryVector = await embeddings.embedQuery(context.query)
      const docsWithScores = await store.similaritySearchVectorWithScore(queryVector, context.topK ?? 4)

      const results = docsWithScores.map(([d]: [SearchDocument, number]) => ({
        content: d.pageContent,
        source: d.metadata.url as string,
        category: d.metadata.category as string,
      }))

      return {
        results,
        sources: [...new Set(results.map((r) => r.source))],
      }
    } catch (error) {
      const setupDetail = error instanceof Error ? error.message : 'MortgageIQ knowledge base is not available.'
      return {
        results: [
          {
            content: `Knowledge base setup required. ${setupDetail} Mortgage House product, rates, policy, and general home-loan education answers require the local knowledge base. Until it is configured, direct users to call Mortgage House on 133 144, set up the knowledge base, or ask calculator/eligibility questions with specific numbers and details.`,
            source: 'local-rag-setup',
            category: 'setup',
          },
        ],
        sources: ['local-rag-setup'],
      }
    }
  },
})
