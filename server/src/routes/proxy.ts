import { Router } from 'express'
import axios from 'axios'

export const proxyRouter = Router()

const CG_API = 'https://api.coingecko.com/api/v3'

interface CacheEntry {
  expires: number
  data: unknown
}
const cache = new Map<string, CacheEntry>()

async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.data as T
  const data = await fetcher()
  cache.set(key, { expires: Date.now() + ttlMs, data })
  return data
}

proxyRouter.get('/coins/markets', async (req, res) => {
  const key = `markets:${JSON.stringify(req.query)}`
  try {
    const data = await cached(key, 60_000, async () => {
      const { data } = await axios.get(`${CG_API}/coins/markets`, { params: req.query })
      return data
    })
    res.json(data)
  } catch (e) {
    res.status(axios.isAxiosError(e) ? e.response?.status ?? 502 : 502).json({ error: 'CoinGecko request failed' })
  }
})

proxyRouter.get('/coins/:id/market_chart', async (req, res) => {
  const key = `chart:${req.params.id}:${JSON.stringify(req.query)}`
  try {
    const data = await cached(key, 5 * 60_000, async () => {
      const { data } = await axios.get(`${CG_API}/coins/${req.params.id}/market_chart`, { params: req.query })
      return data
    })
    res.json(data)
  } catch (e) {
    res.status(axios.isAxiosError(e) ? e.response?.status ?? 502 : 502).json({ error: 'CoinGecko request failed' })
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
    res.status(axios.isAxiosError(e) ? e.response?.status ?? 502 : 502).json({ error: 'CoinGecko request failed' })
  }
})

proxyRouter.get('/fear-greed', async (_req, res) => {
  try {
    const data = await cached('fng', 30 * 60_000, async () => {
      const { data } = await axios.get('https://api.alternative.me/fng/?limit=1')
      return data
    })
    res.json(data)
  } catch {
    res.status(502).json({ error: 'Fear & Greed request failed' })
  }
})
