import { useEffect, useState, useRef } from 'react'
import { searchCoins, type CoinSearchResult, type CoinMarket } from '../lib/coingecko'
import { analyzeCoin, type CoinAnalysis } from '../lib/scoring'

const cgHeaders: Record<string, string> = {}
const cgKey = import.meta.env.VITE_COINGECKO_API_KEY || ''
if (cgKey) cgHeaders['x-cg-demo-api-key'] = cgKey

async function cgFetch(path: string) {
  const r = await fetch(`https://api.coingecko.com/api/v3${path}`, { headers: cgHeaders })
  if (!r.ok) throw new Error(`CoinGecko ${r.status}`)
  return r.json()
}

export function CoinLookup({ onFound }: { onFound: (a: CoinAnalysis) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CoinSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pickedRef = useRef(false)

  useEffect(() => {
    if (!query.trim() || pickedRef.current) {
      if (!query.trim()) setResults([])
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      searchCoins(query).then((r) => {
        if (!cancelled) setResults(r)
      })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  async function fetchCoinDetail(id: string) {
    const data = await cgFetch(`/coins/${id}?localization=false&tickers=false&community_data=true&developer_data=false&sparkline=true`)
    if (!data?.id) throw new Error('Coin not found')

    // Build a CoinMarket-like object from the detail endpoint
    const coin: CoinMarket = {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      image: data.image?.large || '',
      current_price: data.market_data?.current_price?.usd ?? 0,
      market_cap: data.market_data?.market_cap?.usd ?? 0,
      market_cap_rank: data.market_data?.market_cap_rank ?? 0,
      total_volume: data.market_data?.total_volume?.usd ?? 0,
      high_24h: data.market_data?.high_24h?.usd ?? 0,
      low_24h: data.market_data?.low_24h?.usd ?? 0,
      price_change_percentage_24h: data.market_data?.price_change_percentage_24h ?? 0,
      price_change_percentage_7d_in_currency: data.market_data?.price_change_percentage_7d ?? undefined,
      circulating_supply: data.market_data?.circulating_supply ?? 0,
      total_supply: data.market_data?.total_supply ?? null,
      ath: data.market_data?.ath?.usd ?? 0,
      ath_change_percentage: data.market_data?.ath_change_percentage?.usd ?? 0,
    }

    // Extract sparkline prices for indicator calculation
    let prices: number[] = data.market_data?.sparkline_7d?.price || []
    if (prices.length <= 2) {
      try {
        const chart = await cgFetch(`/coins/${id}/market_chart?vs_currency=usd&days=30`)
        prices = (chart.prices || []).map((p: [number, number]) => p[1])
      } catch { prices = [coin.current_price || 0] }
    }
    if (prices.length === 0) prices = [coin.current_price || 0]

    const analysis = analyzeCoin(coin, prices)
    return analysis
  }

  async function pick(r: CoinSearchResult) {
    pickedRef.current = true
    setQuery(r.name)
    setError(null)
    setLoading(true)
    try {
      const analysis = await fetchCoinDetail(r.id)
      onFound(analysis)
      setResults([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed — try again later')
    } finally {
      setLoading(false)
      pickedRef.current = false
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-6">
      <h2 className="text-lg font-semibold text-white mb-2">Look up any coin</h2>
      <div className="relative w-full sm:w-64">
        <input
          value={query}
          onChange={(e) => { pickedRef.current = false; setQuery(e.target.value) }}
          placeholder="Search coin (e.g. dogecoin)"
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full"
        />
        {results.length > 0 && !loading && (
          <ul className="absolute z-10 bg-slate-800 border border-slate-700 rounded mt-1 w-full max-h-48 overflow-y-auto">
            {results.map((r) => (
              <li
                key={r.id}
                onClick={() => pick(r)}
                className="px-2 py-1 text-sm hover:bg-slate-700 cursor-pointer flex items-center gap-2"
              >
                <img src={r.thumb} alt="" className="w-4 h-4" />
                {r.name} <span className="text-slate-500">{r.symbol.toUpperCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {loading && <p className="text-slate-400 text-sm mt-2">Loading market data…</p>}
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  )
}
