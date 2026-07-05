import { useEffect, useState } from 'react'
import { fetchCoinSentiment, type CoinSentiment } from './coingecko'

// Fetched lazily per-coin (only for the coin currently open in detail view,
// or coins the user actually holds) rather than for the whole top-20 list —
// CoinGecko's detail endpoint is heavier than the markets list and the
// backend proxy already serializes upstream calls, so pulling it for every
// row would slow the whole page down for no benefit.
export function useCoinSentiment(coinId: string | null | undefined): CoinSentiment | null {
  const [sentiment, setSentiment] = useState<CoinSentiment | null>(null)

  useEffect(() => {
    setSentiment(null)
    if (!coinId) return
    let cancelled = false
    fetchCoinSentiment(coinId).then((s) => {
      if (!cancelled) setSentiment(s)
    })
    return () => {
      cancelled = true
    }
  }, [coinId])

  return sentiment
}
