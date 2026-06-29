import { useEffect, useState } from 'react'
import { fetchMarketsByIds, fetchPriceHistory, searchCoins, type CoinSearchResult } from '../lib/coingecko'
import { analyzeCoin, type CoinAnalysis } from '../lib/scoring'

export function CoinLookup({ onFound }: { onFound: (a: CoinAnalysis) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CoinSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
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

  async function pick(r: CoinSearchResult) {
    setResults([])
    setQuery(r.name)
    setError(null)
    setLoading(true)
    try {
      const [coin] = await fetchMarketsByIds([r.id])
      if (!coin) throw new Error('No market data for this coin')
      const history = await fetchPriceHistory(r.id, 30).catch(() => [coin.current_price])
      onFound(analyzeCoin(coin, history))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-6">
      <h2 className="text-lg font-semibold text-white mb-2">Look up any coin</h2>
      <div className="relative w-64">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search coin (e.g. dogecoin)"
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 bg-slate-800 border border-slate-700 rounded mt-1 w-64 max-h-48 overflow-y-auto">
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
      {loading && <p className="text-slate-400 text-sm mt-2">Loading…</p>}
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  )
}
