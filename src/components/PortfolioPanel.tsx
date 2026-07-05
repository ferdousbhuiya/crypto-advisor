import { useEffect, useState } from 'react'
import type { CoinAnalysis } from '../lib/scoring'
import { searchCoins, type CoinSearchResult } from '../lib/coingecko'
import { usePortfolio, type NewHolding } from '../lib/usePortfolio'
import { getVerdict, holdingAction } from '../lib/verdict'

const PLATFORMS = ['Coinbase', 'Binance', 'Robinhood', 'Kraken', 'Bybit', 'KuCoin', 'Crypto.com', 'অন্য একটি (Other)']
const MAX_HOLDINGS = 20

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function fmtMoney(n: number, digits = 2) {
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function verdictColor(v: ReturnType<typeof getVerdict>['verdict']) {
  if (v === 'CRITICAL') return 'text-red-300 bg-red-900 border-red-600'
  if (v === 'BUY_NOW') return 'text-green-400 bg-green-950 border-green-700'
  if (v === 'ACCUMULATE') return 'text-lime-400 bg-lime-950 border-lime-700'
  if (v === 'HOLD') return 'text-yellow-400 bg-yellow-950 border-yellow-700'
  return 'text-red-400 bg-red-950 border-red-700'
}

function AddHoldingForm({
  onAdd,
  disabled,
}: {
  onAdd: (h: NewHolding) => Promise<string | null>
  disabled: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CoinSearchResult[]>([])
  const [picked, setPicked] = useState<CoinSearchResult | null>(null)
  const [amount, setAmount] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(todayStr())
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  async function submit() {
    const amt = parseFloat(amount)
    const price = parseFloat(purchasePrice)
    setError(null)
    if (!picked) return setError('একটা কয়েন খুঁজে বেছে নিন।')
    if (!amt || amt <= 0) return setError('কত পরিমাণ কিনেছেন তা লিখুন (০ এর বেশি হতে হবে)।')
    if (!price || price <= 0) return setError('কেনার সময় প্রতি কয়েনের রেট লিখুন।')
    if (!purchaseDate) return setError('কেনার তারিখ দিন।')

    setBusy(true)
    const err = await onAdd({
      coinId: picked.id,
      symbol: picked.symbol,
      name: picked.name,
      amount: amt,
      purchasePrice: price,
      purchaseDate,
      platform,
    })
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setQuery('')
    setPicked(null)
    setAmount('')
    setPurchasePrice('')
    setPurchaseDate(todayStr())
    setPlatform(PLATFORMS[0])
    setResults([])
  }

  if (disabled) {
    return (
      <p className="text-yellow-400 text-sm mb-3">
        আপনার হোল্ডিং লিস্ট {MAX_HOLDINGS}টা কয়েনে পূর্ণ হয়ে গেছে। নতুন একটা যোগ করতে হলে আগে একটা বাদ দিন।
      </p>
    )
  }

  return (
    <div className="mb-3">
      <div className="flex flex-col sm:flex-wrap sm:flex-row items-stretch sm:items-end gap-2">
        <div className="relative w-full sm:w-56">
          <label className="block text-xs text-slate-500 mb-1">কয়েন</label>
          <input
            value={picked ? `${picked.name} (${picked.symbol.toUpperCase()})` : query}
            onChange={(e) => {
              setPicked(null)
              setQuery(e.target.value)
            }}
            placeholder="খুঁজুন (যেমন bitcoin)"
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full"
          />
          {results.length > 0 && (
            <ul className="absolute z-10 bg-slate-800 border border-slate-700 rounded mt-1 w-full max-h-48 overflow-y-auto">
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
        <div className="w-full sm:w-28">
          <label className="block text-xs text-slate-500 mb-1">পরিমাণ</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.5"
            type="number"
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full"
          />
        </div>
        <div className="w-full sm:w-32">
          <label className="block text-xs text-slate-500 mb-1">কেনার রেট ($)</label>
          <input
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="65000"
            type="number"
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="block text-xs text-slate-500 mb-1">কেনার তারিখ</label>
          <input
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            type="date"
            max={todayStr()}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="block text-xs text-slate-500 mb-1">প্ল্যাটফর্ম</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={submit}
          disabled={busy}
          className="bg-purple-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm px-3 py-2 rounded w-full sm:w-auto"
        >
          {busy ? 'যোগ হচ্ছে…' : 'হোল্ডিং যোগ করুন'}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  )
}

export function PortfolioPanel({ allAnalyses }: { allAnalyses: CoinAnalysis[] }) {
  const { holdings, addHolding, removeHolding, loaded } = usePortfolio()

  const totals = holdings.reduce(
    (acc, h) => {
      const a = allAnalyses.find((x) => x.coin.id === h.coinId)
      const invested = h.amount * h.purchasePrice
      const current = a ? a.coin.current_price * h.amount : null
      acc.invested += invested
      if (current !== null) acc.current += current
      if (current === null) acc.missing = true
      return acc
    },
    { invested: 0, current: 0, missing: false },
  )
  const totalPnl = totals.current - totals.invested
  const totalPnlPct = totals.invested > 0 ? (totalPnl / totals.invested) * 100 : 0

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-6">
      <h2 className="text-lg font-semibold text-white mb-2">আপনার হোল্ডিং</h2>
      <AddHoldingForm onAdd={addHolding} disabled={holdings.length >= MAX_HOLDINGS} />
      {!loaded && <p className="text-slate-500 text-sm">হোল্ডিং লোড হচ্ছে…</p>}
      {loaded && holdings.length === 0 && <p className="text-slate-500 text-sm">এখনো কোনো হোল্ডিং যোগ করা হয়নি।</p>}
      {loaded && holdings.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm min-w-[980px]">
            <thead className="text-slate-400">
              <tr>
                <th className="text-left p-1">কয়েন</th>
                <th className="text-left p-1">প্ল্যাটফর্ম</th>
                <th className="text-left p-1">কেনার তারিখ</th>
                <th className="text-right p-1">কেনার রেট</th>
                <th className="text-right p-1">পরিমাণ</th>
                <th className="text-right p-1">বিনিয়োগ</th>
                <th className="text-right p-1">বর্তমান মূল্য</th>
                <th className="text-right p-1">লাভ/ক্ষতি</th>
                <th className="text-center p-1">সিগন্যাল</th>
                <th className="text-left p-1">পরামর্শ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const a = allAnalyses.find((x) => x.coin.id === h.coinId)
                const v = a ? getVerdict(a) : null
                const invested = h.amount * h.purchasePrice
                const current = a ? a.coin.current_price * h.amount : null
                const pnl = current !== null ? current - invested : null
                const pnlPct = current !== null && invested > 0 ? (pnl! / invested) * 100 : null
                return (
                  <tr key={h.id} className="border-t border-slate-800">
                    <td className="p-1">
                      {h.name} <span className="text-slate-500">{h.symbol.toUpperCase()}</span>
                    </td>
                    <td className="p-1 text-slate-300">{h.platform}</td>
                    <td className="p-1 text-slate-300 font-mono">{h.purchaseDate.slice(0, 10)}</td>
                    <td className="p-1 text-right font-mono">${fmtMoney(h.purchasePrice, 4)}</td>
                    <td className="p-1 text-right font-mono">{h.amount}</td>
                    <td className="p-1 text-right font-mono">${fmtMoney(invested)}</td>
                    <td className="p-1 text-right font-mono">{current !== null ? `$${fmtMoney(current)}` : '—'}</td>
                    <td className={`p-1 text-right font-mono ${pnl !== null ? (pnl >= 0 ? 'text-green-400' : 'text-red-400') : ''}`}>
                      {pnl !== null ? `${pnl >= 0 ? '+' : ''}$${fmtMoney(pnl)} (${pnlPct! >= 0 ? '+' : ''}${fmtMoney(pnlPct!, 1)}%)` : '—'}
                    </td>
                    <td className="p-1 text-center">
                      {v ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${verdictColor(v.verdict)}`}>
                          {v.label}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">লোড হচ্ছে…</span>
                      )}
                    </td>
                    <td className="p-1 text-slate-300">{v ? holdingAction(v) : '—'}</td>
                    <td className="p-1 text-right">
                      <button onClick={() => removeHolding(h.id)} className="text-slate-500 hover:text-red-400 text-xs whitespace-nowrap">
                        বাদ দিন
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 font-semibold">
                <td className="p-1" colSpan={5}>
                  মোট
                </td>
                <td className="p-1 text-right font-mono">${fmtMoney(totals.invested)}</td>
                <td className="p-1 text-right font-mono">
                  {totals.missing ? `~$${fmtMoney(totals.current)}` : `$${fmtMoney(totals.current)}`}
                </td>
                <td className={`p-1 text-right font-mono ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalPnl >= 0 ? '+' : ''}${fmtMoney(totalPnl)} ({totalPnlPct >= 0 ? '+' : ''}
                  {fmtMoney(totalPnlPct, 1)}%)
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
