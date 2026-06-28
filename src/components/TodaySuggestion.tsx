import type { CoinAnalysis } from '../lib/scoring'
import { buildDailySummary, plainExplanation } from '../lib/summary'
import { useFearGreed } from '../lib/useFearGreed'

function moodBadge(mood: 'bullish' | 'neutral' | 'bearish') {
  if (mood === 'bullish') return <span className="text-green-400">Market mood: Good week 📈</span>
  if (mood === 'bearish') return <span className="text-red-400">Market mood: Rough week 📉</span>
  return <span className="text-yellow-400">Market mood: Mixed week ➖</span>
}

export function TodaySuggestion({ analyses }: { analyses: CoinAnalysis[] }) {
  const fearGreed = useFearGreed()
  const summary = buildDailySummary(analyses, fearGreed)

  return (
    <div className="bg-slate-900 border-2 border-purple-700 rounded-lg p-5 mb-6">
      <p className="text-purple-300 text-xs uppercase tracking-wide mb-2 font-bold">Today's suggestion</p>

      <p className="text-slate-100 text-base leading-relaxed mb-2">{summary.pickSentence}</p>
      <p className="text-slate-400 text-sm mb-2">{moodBadge(summary.mood)} — {summary.moodSentence}</p>
      {summary.fearGreedSentence && (
        <p className="text-slate-400 text-sm mb-3">{summary.fearGreedSentence}</p>
      )}

      {summary.avoid.length > 0 && (
        <div className="bg-red-950 border border-red-700 rounded p-3 mt-2">
          <p className="text-red-300 font-bold text-sm mb-1">⚠ Coins in risky shape right now</p>
          {summary.avoid.map((a) => (
            <p key={a.coin.id} className="text-red-200 text-sm">
              <strong>{a.coin.name}</strong> — {plainExplanation(a)} If you hold this one, it may be safer to sell some now rather than wait.
            </p>
          ))}
        </div>
      )}

      <p className="text-slate-500 text-xs mt-3">
        This is a plain-English read of price trends and momentum, not a guarantee — crypto can move against any
        signal. Treat this as a starting point, not financial advice.
      </p>
    </div>
  )
}
