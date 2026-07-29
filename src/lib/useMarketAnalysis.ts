import { useEffect, useState } from 'react'
import { fetchMarketsByIds, fetchPriceHistory, fetchTopMarkets, type CoinMarket } from './coingecko'
import { analyzeCoin, rankCoins, type CoinAnalysis } from './scoring'

interface State {
  loading: boolean
  error: string | null
  analyses: CoinAnalysis[]
  allAnalyses: CoinAnalysis[]
  progress: number
  total: number
}

const COIN_LIMIT = 20

// The backend proxy serializes + caches upstream CoinGecko calls, so it's
// safe to fire all coin requests concurrently here instead of spacing them
// out client-side — that spacing used to be the only rate-limit defense
// when the client hit CoinGecko directly.
async function analyzeWithHistory(coin: Parameters<typeof analyzeCoin>[0]): Promise<CoinAnalysis> {
  let history: number[] | null = null
  try {
    history = await fetchPriceHistory(coin.id, 30)
  } catch {
    /* fall back to a single current-price point below */
  }
  return analyzeCoin(coin, history ?? [coin.current_price])
}

export function useMarketAnalysis(extraCoinIds: string[] = []) {
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    analyses: [],
    allAnalyses: [],
    progress: 0,
    total: COIN_LIMIT,
  })

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        let markets: CoinMarket[] | undefined
        for (let attempt = 0; ; attempt++) {
          try {
            markets = await fetchTopMarkets(COIN_LIMIT)
            break
          } catch (e) {
            if (attempt >= 2) throw e
            await new Promise((r) => setTimeout(r, 5000))
          }
        }

        const results: CoinAnalysis[] = []
        await Promise.all(
          markets.map(async (coin) => {
            const analysis = await analyzeWithHistory(coin)
            if (cancelled) return
            results.push(analysis)
            setState((s) => ({ ...s, progress: s.progress + 1 }))
          }),
        )

        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            analyses: rankCoins(results),
            allAnalyses: results,
          }))
        }
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: e instanceof Error ? e.message : 'Failed to load market data',
          }))
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  const extraKey = extraCoinIds.slice().sort().join(',')

  useEffect(() => {
    if (state.loading) return
    const missing = extraCoinIds.filter((id) => !state.allAnalyses.some((a) => a.coin.id === id))
    if (missing.length === 0) return
    let cancelled = false

    async function fetchMissing() {
      try {
        const markets = await fetchMarketsByIds(missing)
        const added = await Promise.all(markets.map((coin) => analyzeWithHistory(coin)))
        if (!cancelled && added.length > 0) {
          setState((s) => ({ ...s, allAnalyses: [...s.allAnalyses, ...added] }))
        }
      } catch {
        // held coin lookup failed — portfolio row will show "loading…" until next reload
      }
    }

    fetchMissing()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraKey, state.loading])

  return state
}
