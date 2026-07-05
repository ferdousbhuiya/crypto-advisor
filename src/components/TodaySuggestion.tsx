import type { CoinAnalysis } from '../lib/scoring'
import { buildDailySummary, plainExplanation } from '../lib/summary'
import { useFearGreed } from '../lib/useFearGreed'

function moodBadge(mood: 'bullish' | 'neutral' | 'bearish') {
  if (mood === 'bullish') return <span className="text-green-400">বাজারের মেজাজ: ভালো সপ্তাহ 📈</span>
  if (mood === 'bearish') return <span className="text-red-400">বাজারের মেজাজ: খারাপ সপ্তাহ 📉</span>
  return <span className="text-yellow-400">বাজারের মেজাজ: মিশ্র সপ্তাহ ➖</span>
}

export function TodaySuggestion({ analyses }: { analyses: CoinAnalysis[] }) {
  const fearGreed = useFearGreed()
  const summary = buildDailySummary(analyses, fearGreed)

  return (
    <div className="bg-slate-900 border-2 border-purple-700 rounded-lg p-4 sm:p-5 mb-6">
      <p className="text-purple-300 text-xs uppercase tracking-wide mb-2 font-bold">আজকের পরামর্শ</p>

      <p className="text-slate-100 text-base leading-relaxed mb-2">{summary.pickSentence}</p>
      <p className="text-slate-400 text-sm mb-2 flex flex-wrap gap-x-2 gap-y-1">
        <span>{moodBadge(summary.mood)}</span> <span>— {summary.moodSentence}</span>
      </p>
      {summary.fearGreedSentence && (
        <p className="text-slate-400 text-sm mb-3">{summary.fearGreedSentence}</p>
      )}

      {summary.avoid.length > 0 && (
        <div className="bg-red-950 border border-red-700 rounded p-3 mt-2">
          <p className="text-red-300 font-bold text-sm mb-1">⚠ এই মুহূর্তে যেসব কয়েন ঝুঁকিপূর্ণ অবস্থায় আছে</p>
          {summary.avoid.map((a) => (
            <p key={a.coin.id} className="text-red-200 text-sm">
              <strong>{a.coin.name}</strong> — {plainExplanation(a)} এটা যদি আপনার কাছে থাকে, অপেক্ষা না করে এখনই কিছুটা বিক্রি করে দেওয়া নিরাপদ হতে পারে।
            </p>
          ))}
        </div>
      )}

      <p className="text-slate-500 text-xs mt-3">
        এটা দাম ও মোমেন্টামের সহজ ভাষায় একটা বিশ্লেষণ মাত্র, কোনো গ্যারান্টি না — ক্রিপ্টো যেকোনো সিগন্যালের বিপরীতেও যেতে পারে।
        এটাকে শুরুর পয়েন্ট হিসেবে ধরুন, আর্থিক পরামর্শ হিসেবে না।
      </p>
    </div>
  )
}
