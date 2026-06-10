import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const BASE_URL = process.env.WEBSITE_BASE_URL ?? 'https://www.mortgagehouse.com.au'
const allowedHost = new URL(BASE_URL).host.replace(/^www\./, '')

// Short TTL cache: repeated questions in a conversation hit the same pages,
// and hammering the site invites bot-blocking. Single-version snapshot per
// URL — no shared mutable state across requests.
const CACHE_TTL_MS = 5 * 60_000
const CACHE_MAX_ENTRIES = 50
const pageCache = new Map<string, { expires: number; payload: { url: string; content: string } }>()

// Crude but dependency-free HTML→text: good enough for an LLM to read a page
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const websiteFetchTool = createTool({
  id: 'website_fetch',
  description: `Fetch a page from the Mortgage House website (${BASE_URL}) and return its readable text content. Accepts a path like "/home-loans" or a full URL on the same site.`,
  inputSchema: z.object({
    url: z
      .string()
      .default('/')
      .describe('Page path (e.g. "/home-loans") or full URL on the allowed website'),
  }),
  execute: async (inputData) => {
    let target: URL
    try {
      target = new URL(inputData.url ?? '/', BASE_URL)
    } catch {
      return { error: `Invalid URL: ${inputData.url}` }
    }

    // SSRF guard: the agent's url argument is LLM-generated (and ultimately
    // user-influenced) — only the configured website may be fetched, https only
    if (target.protocol !== 'https:' || target.host.replace(/^www\./, '') !== allowedHost) {
      return { error: `Only pages on ${allowedHost} can be fetched.`, url: target.href }
    }

    const cached = pageCache.get(target.href)
    if (cached && cached.expires > Date.now()) {
      return cached.payload
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    try {
      const res = await fetch(target.href, {
        signal: controller.signal,
        headers: { 'User-Agent': 'MortgageIQ-Assistant/1.0' },
        redirect: 'follow',
      })
      if (!res.ok) {
        return { error: `Fetch failed with status ${res.status}`, url: target.href }
      }
      // Re-check after redirects — a redirect could leave the allowed host
      if (new URL(res.url).host.replace(/^www\./, '') !== allowedHost) {
        return { error: 'Page redirected off the allowed website.', url: res.url }
      }
      const text = htmlToText(await res.text()).slice(0, 8000)
      const payload = { url: res.url, content: text || 'Page contained no readable text.' }
      if (pageCache.size >= CACHE_MAX_ENTRIES) {
        pageCache.delete(pageCache.keys().next().value as string)
      }
      pageCache.set(target.href, { expires: Date.now() + CACHE_TTL_MS, payload })
      return payload
    } catch (error) {
      return {
        error: `Could not fetch the page: ${error instanceof Error ? error.message : 'unknown error'}`,
        url: target.href,
      }
    } finally {
      clearTimeout(timer)
    }
  },
})
