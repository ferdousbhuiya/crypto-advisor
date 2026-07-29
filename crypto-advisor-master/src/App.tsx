import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase' // NEW: Supabase client
import { Session } from '@supabase/supabase-js' // NEW: Session type
import { useMarketAnalysis } from './lib/useMarketAnalysis'
import type { CoinAnalysis } from './lib/scoring'
import { getVerdict, type Verdict } from './lib/verdict'
// REMOVED: import { usePortfolio } from './lib/usePortfolio'
// REMOVED: import { useAuth } from './lib/AuthContext'
// REMOVED: import { PortfolioPanel } from './components/PortfolioPanel'
import { PriceChart } from './components/PriceChart'
import { TodaySuggestion } from './components/TodaySuggestion'
import { AuthPanel } from './components/AuthPanel'
import { CoinLookup } from './components/CoinLookup'
import { useCoinSentiment } from './lib/useCoinSentiment'
import { sentimentSignal } from './lib/sentiment'
import FamilyPortfolio from './components/FamilyPortfolio' // NEW: Family P&L View

// --- KEEP YOUR EXISTING HELPER FUNCTIONS ---
function fmt(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: digits })
}

function verdictColor(v: Verdict) {
  if (v === 'CRITICAL') return 'text-red-300 bg-red-900 border border-red-600'
  if (v === 'BUY_NOW') return 'text-green-400 bg-green-950'
  if (v === 'ACCUMULATE') return 'text-lime-400 bg-lime-950'
  if (v === 'HOLD') return 'text-yellow-400 bg-yellow-950'
  return 'text-red-400 bg-red-950'
}

// --- KEEP YOUR EXISTING CoinDetail COMPONENT EXACTLY AS IS ---
function CoinDetail({ a }: { a: CoinAnalysis }) {
  // ... (Keep all your existing CoinDetail code here: RSI, MACD, Sentiment, PriceChart, etc.) ...
  // For brevity in this prompt, assume your existing CoinDetail code is pasted here.
  const v = getVerdict(a)
  const sentiment = useCoinSentiment(a.coin.id)
  const sentimentNote = sentiment ? sentimentSignal(sentiment) : null
  const rows: [string, string][] = [
    ['Price (USD)', `$${fmt(a.coin.current_price, 4)}`],
    ['Market cap', `$${fmt(a.coin.market_cap, 0)}`],
    ['24h change', `${fmt(a.change24h)}%`],
    ['RSI (14d)', fmt(a.rsi, 1)],
    ['MACD', a.macd ? fmt(a.macd.macd, 4) : '—'],
  ]
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mt-4 text-left">
      <h3 className="text-lg font-semibold text-white mb-2">{a.coin.name} Technicals</h3>
      <PriceChart coinId={a.coin.id} />
      <div className="grid grid-cols-2 gap-2 text-sm mt-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-slate-800 py-1">
            <span className="text-slate-400">{label}</span>
            <span className="text-slate-100 font-mono">{value}</span>
          </div>
        ))}
      </div>
      {sentimentNote && <div className="mt-3 text-purple-300 text-sm">{sentimentNote}</div>}
    </div>
  )
}

function App() {
  // NEW: Supabase Session State Management
  const [session, setSession] = useState<Session | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingAuth(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // To keep your existing useMarketAnalysis hook working without major refactoring,
  // we pass a default list of top coins for the general market overview.
  // (Your specific family holdings are now handled by FamilyPortfolio below).
  const defaultMarketIds = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple']
  
  const { loading, error, analyses, allAnalyses, progress, total } = useMarketAnalysis(defaultMarketIds)
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lookup, setLookup] = useState<CoinAnalysis | null>(null)

  const selected = lookup ?? analyses.find((a) => a.coin.id === selectedId) ?? analyses[0]
  const topPick = analyses[0]

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loadingAuth) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading secure session...</div>
  }

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 text-center">Family Wealth Advisor</h1>
          <p className="text-slate-400 text-sm mb-6 text-center">
            Securely track your family's investments, monitor live P&L, and get market signals.
          </p>
          <AuthPanel />
        </div>
      </div>
    )
  }

  // --- DASHBOARD (LOGGED IN) ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-3 sm:px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER WITH LOGOUT */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Family Wealth Advisor</h1>
            <p className="text-slate-400 text-sm">Logged in as {session.user.email}</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-semibold"
          >
            Logout
          </button>
        </div>

        {/* NEW: FAMILY PORTFOLIO (PnL, Platforms, Cost Basis, Signals) */}
        <FamilyPortfolio />

        {/* DIVIDER */}
        <div className="mt-8 border-t border-slate-800 pt-8">
          <h2 className="text-xl font-bold text-white mb-4">Market Analysis & Technical Signals</h2>
          
          <CoinLookup onFound={setLookup} />

          {loading && (
            <div className="text-slate-300">
              Loading market data and computing indicators… {progress}/{total}
              <div className="w-full bg-slate-800 rounded h-2 mt-2">
                <div className="bg-purple-500 h-2 rounded transition-all" style={{ width: `${(progress / total) * 100}%` }} />
              </div>
            </div>
          )}

          {error && <div className="text-red-400">Error: {error}</div>}

          {!loading && !error && <TodaySuggestion analyses={analyses} />}

          {!loading && !error && topPick && (
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 border border-purple-700 rounded-lg p-5 mb-6 mt-4">
              <p className="text-purple-300 text-sm uppercase tracking-wide mb-1">Top suggestion (technical)</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <img src={topPick.coin.image} alt="" className="w-10 h-10" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {topPick.coin.name} ({topPick.coin.symbol.toUpperCase()})
                  </h2>
                  <p className="text-slate-300 text-sm">
                    Score {topPick.score}/100 · ${fmt(topPick.coin.current_price, 4)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* KEEP YOUR EXISTING TABLE EXACTLY AS IS */}
          {!loading && !error && (
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mt-4">
              <table className="w-full text-sm border border-slate-800 rounded-lg overflow-hidden min-w-[640px]">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Coin</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-right p-2">24h</th>
                    <th className="text-right p-2">RSI</th>
                    <th className="text-right p-2">Score</th>
                    <th className="text-center p-2">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((a, idx) => {
                    const v = getVerdict(a)
                    return (
                      <tr
                        key={a.coin.id}
                        onClick={() => { setLookup(null); setSelectedId(a.coin.id) }}
                        className={`cursor-pointer border-t border-slate-800 hover:bg-slate-800 ${selected?.coin.id === a.coin.id ? 'bg-slate-800' : ''}`}
                      >
                        <td className="p-2 text-slate-500">{idx + 1}</td>
                        <td className="p-2 flex items-center gap-2">
                          <img src={a.coin.image} alt="" className="w-5 h-5" />
                          {a.coin.name} <span className="text-slate-500">{a.coin.symbol.toUpperCase()}</span>
                        </td>
                        <td className="p-2 text-right font-mono">${fmt(a.coin.current_price, 4)}</td>
                        <td className={`p-2 text-right font-mono ${a.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(a.change24h)}%</td>
                        <td className="p-2 text-right font-mono">{fmt(a.rsi, 0)}</td>
                        <td className="p-2 text-right font-mono">{a.score}</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${verdictColor(v.verdict)}`}>{v.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selected && <CoinDetail a={selected} />}
        </div>
      </div>
    </div>
  )
}

export default App