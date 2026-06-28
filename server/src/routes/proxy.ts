import { Router } from 'express'
import axios from 'axios'

export const proxyRouter = Router()

const CG_API = 'https://api.coingecko.com/api/v3'

interface CacheEntry {
  expires: number
  data: unknown
}
const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<unknown>>()

// CoinGecko's free tier shares one rate limit across the whole outbound IP.
// Every visitor's page load fires ~12 requests, so without serializing we
// burn the per-minute quota in seconds and everyone after sees 429s.
// This queue forces a minimum gap between actual upstream calls.
const MIN_GAP_MS = 1500
let queueTail: Promise<unknown> = Promise.resolve()

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueTail.then(async () => {
    const result = await fn()
    await new Promise((r) => setTimeout(r, MIN_GAP_MS))
    return result
  })
  queueTail = run.catch(() => undefined)
  return run
}

async function withRetry<T>(fetcher: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await enqueue(fetcher)
    } catch (e) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined
      if (status === 429 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 10_000))
        continue
      }
      throw e
    }
  }
}

async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.data as T

  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  const promise = withRetry(fetcher)
    .then((data) => {
      cache.set(key, { expires: Date.now() + ttlMs, data })
      return data
    })
    .finally(() => inFlight.delete(key))

  inFlight.set(key, promise)
  return promise
}

function handleError(e: unknown, res: import('express').Response) {
  const status = axios.isAxiosError(e) ? e.response?.status ?? 502 : 502
  res.status(status).json({ error: status === 429 ? 'Rate limited upstream, try again shortly' : 'CoinGecko request failed' })
}

proxyRouter.get('/coins/markets', async (req, res) => {
  const key = `markets:${JSON.stringify(req.query)}`
  try {
    const data = await cached(key, 90_000, async () => {
      const { data } = await axios.get(`${CG_API}/coins/markets`, { params: req.query })
      return data
    })
    res.json(data)
  } catch (e) {
    handleError(e, res)
  }
})

proxyRouter.get('/coins/:id/market_chart', async (req, res) => {
  const key = `chart:${req.params.id}:${JSON.stringify(req.query)}`
  try {
    const data = await cached(key, 15 * 60_000, async () => {
      const { data } = await axios.get(`${CG_API}/coins/${req.params.id}/market_chart`, { params: req.query })
      return data
    })
    res.json(data)
  } catch (e) {
    handleError(e, res)
  }
})

proxyRouter.get('/search', async (req, res) => {
  const key = `search:${JSON.stringify(req.query)}`
  try {
    const data = await cached(key, 5 * 60_000, async () => {
      const { data } = await axios.get(`${CG_API}/search`, { params: req.query })
      return data
    })
    res.json(data)
  } catch (e) {
    handleError(e, res)
  }
})

proxyRouter.get('/fear-greed', async (_req, res) => {
  try {
    const data = await cached('fng', 30 * 60_000, async () => {
      const { data } = await axios.get('https://api.alternative.me/fng/?limit=1')
      return data
    })
    res.json(data)
  } catch (e) {
    handleError(e, res)
  }
})
