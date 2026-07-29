import { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetchPriceSeries, type PricePoint } from '../lib/coingecko'

const TIMEFRAMES = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
] as const

function fmtTime(t: number, days: number) {
  const d = new Date(t)
  if (days <= 1) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function PriceChart({ coinId }: { coinId: string }) {
  const [days, setDays] = useState<number>(7)
  const [data, setData] = useState<PricePoint[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cacheKey = `${coinId}-${days}`

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)
    fetchPriceSeries(coinId, days)
      .then((series) => {
        if (!cancelled) setData(series)
      })
      .catch(() => {
        if (!cancelled) setError('Chart data unavailable (rate limited) — try again shortly.')
      })
    return () => {
      cancelled = true
    }
  }, [coinId, days, cacheKey])

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.label}
            onClick={() => setDays(tf.days)}
            className={`px-2 py-1 rounded text-xs font-semibold ${
              days === tf.days ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!error && !data && <p className="text-slate-500 text-sm">Loading chart…</p>}
      {!error && data && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <XAxis
              dataKey="time"
              tickFormatter={(t) => fmtTime(t, days)}
              stroke="#64748b"
              fontSize={11}
              minTickGap={40}
            />
            <YAxis
              domain={['auto', 'auto']}
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(v) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              width={70}
            />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
              labelFormatter={(t) => new Date(t).toLocaleString()}
              formatter={(v) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 })}`, 'Price']}
            />
            <Line type="monotone" dataKey="price" stroke="#c084fc" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
