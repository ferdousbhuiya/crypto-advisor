import { useEffect, useState } from 'react'
import type { CoinAnalysis } from '../lib/scoring'
import { searchCoins, type CoinSearchResult } from '../lib/coingecko'
import { usePortfolio, type Holding } from '../lib/usePortfolio'
import { getVerdict, holdingAction } from '../lib/verdict'

function verdictColor(v: ReturnType<typeof getVerdict>['verdict']) {
  if (v === 'CRITICAL') return 'text-red-300 bg-red-900 border-red-600'
  if (v === 'BUY_NOW') return 'text-green-400 bg-green-950 border-green-700'
  if (v === 'ACCUMULATE') return 'text-lime-400 bg-lime-950 border-lime-700'
  if (v === 'HOLD') return 'text-yellow-400 bg-yellow-950 border-yellow-700'
  return 'text-red-400 bg-red-950 border-red-700'
}

function AddHoldingForm({ onAdd }: { onAdd: (h: Holding) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CoinSearchResult[]>([])
  const [picked, setPicked] = useState<CoinSearchResult | null>(null)
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (!query.trim() || picked) {
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
  }, [query, picked])

  function submit() {
    const amt = parseFloat(amount)
    if (!picked || !amt || amt <= 0) return
    onAdd({ coinId: picked.id, symbol: picked.symbol, name: picked.name, amount: amt })
    setQuery('')
    setPicked(null)
    setAmount('')
    setResults([])
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <div className="relative">
        <input
          value={picked ? `${picked.name} (${picked.symbol.toUpperCase()})` : query}
          onChange={(e) => {
            setPicked(null)
            setQuery(e.target.value)
          }}
          placeholder="Search coin (e.g. bitcoin)"
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-56"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 bg-slate-800 border border-slate-700 rounded mt-1 w-56 max-h-48 overflow-y-auto">
            {results.map((r) => (
              <li
                key={r.id}
                onClick={() => {
                  setPicked(r)
                  setResults([])
                }}
                className="px-2 py-1 text-sm hover:bg-slate-700 cursor-pointer flex items-center gap-2"
              >
                <img src={r.thumb} alt="" className="w-4 h-4" />
                {r.name} <span className="text-slate-500">{r.symbol.toUpperCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount held"
        type="number"
        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-32"
      />
      <button
        onClick={submit}
        disabled={!picked || !amount}
        className="bg-purple-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm px-3 py-1 rounded"
      >
        Add holding
      </button>
    </div>
  )
}

export function PortfolioPanel({ allAnalyses }: { allAnalyses: CoinAnalysis[] }) {
  const { holdings, addHolding, removeHolding, loaded } = usePortfolio()

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-6">
      <h2 className="text-lg font-semibold text-white mb-2">Your holdings</h2>
      <AddHoldingForm onAdd={addHolding} />
      {!loaded && <p className="text-slate-500 text-sm">Loading holdings…</p>}
      {loaded && holdings.length === 0 && <p className="text-slate-500 text-sm">No holdings added yet.</p>}
      {loaded && holdings.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="text-left p-1">Coin</th>
              <th className="text-right p-1">Amount</th>
              <th className="text-right p-1">Value</th>
              <th className="text-center p-1">Verdict</th>
              <th className="text-left p-1">Action</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const a = allAnalyses.find((x) => x.coin.id === h.coinId)
              const v = a ? getVerdict(a) : null
              return (
                <tr key={h.coinId} className="border-t border-slate-800">
                  <td className="p-1">
                    {h.name} <span className="text-slate-500">{h.symbol.toUpperCase()}</span>
                  </td>
                  <td className="p-1 text-right font-mono">{h.amount}</td>
                  <td className="p-1 text-right font-mono">
                    {a ? `$${(a.coin.current_price * h.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="p-1 text-center">
                    {v ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${verdictColor(v.verdict)}`}>
                        {v.label}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">loading…</span>
                    )}
                  </td>
                  <td className="p-1 text-slate-300">{v ? holdingAction(v) : '—'}</td>
                  <td className="p-1 text-right">
                    <button onClick={() => removeHolding(h.coinId)} className="text-slate-500 hover:text-red-400 text-xs">
                      remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
