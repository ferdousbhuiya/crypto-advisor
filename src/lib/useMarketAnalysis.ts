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

const COIN_LIMIT = 12

async function analyzeWithHistory(coin: Parameters<typeof analyzeCoin>[0]): Promise<CoinAnalysis> {
  let history: number[] | null = null
  for (let attempt = 0; attempt < 2 && history === null; attempt++) {
    try {
      history = await fetchPriceHistory(coin.id, 30)
    } catch {
      await new Promise((r) => setTimeout(r, 12000))
    }
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
        let markets: CoinMarket[]
        for (let attempt = 0; ; attempt++) {
          try {
            markets = await fetchTopMarkets(COIN_LIMIT)
            break
          } catch (e) {
            if (attempt >= 2) throw e
            await new Promise((r) => setTimeout(r, 15000))
          }
        }
        const results: CoinAnalysis[] = []
        for (let i = 0; i < markets.length; i++) {
          if (cancelled) return
          results.push(await analyzeWithHistory(markets[i]))
          if (!cancelled) setState((s) => ({ ...s, progress: i + 1 }))
          await new Promise((r) => setTimeout(r, 5000))
        }
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
        const added: CoinAnalysis[] = []
        for (const coin of markets) {
          if (cancelled) return
          added.push(await analyzeWithHistory(coin))
          await new Promise((r) => setTimeout(r, 3000))
        }
        if (!cancelled && added.length > 0) {
          setState((s) => ({ ...s, allAnalyses: [...s.allAnalyses, ...added] }))
        }
      } catch {
        // held coin lookup failed — portfolio row will show "no data" until next reload
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
