import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Transaction } from '../lib/supabase';
import { calculatePositions } from '../lib/portfolioAnalytics';
import type { PositionData } from '../lib/portfolioAnalytics';

export default function FamilyPortfolio() {
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function deleteSymbol(symbol: string) {
    if (!confirm(`Delete all ${symbol} transactions?`)) return;
    setDeleting(symbol);
    const { error } = await supabase.from('transactions').delete().eq('asset_symbol', symbol);
    if (!error) window.location.reload();
    setDeleting(null);
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: txs, error: txError } = await supabase.from('transactions').select('*');

      if (txError) {
        console.error("Error fetching transactions:", txError);
        setLoading(false);
        return;
      }

      if (txs && txs.length > 0) {
        const symbols = [...new Set(txs.map((t: any) => t.asset_symbol))];
        const headers: Record<string, string> = {};
        const cgKey = import.meta.env.VITE_COINGECKO_API_KEY || '';
        if (cgKey) headers['x-cg-demo-api-key'] = cgKey;

        // Check localStorage cache (5 min TTL)
        const cacheKey = 'cg_prices';
        let livePrices: Record<string, number> = {};
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const { data, expiry } = JSON.parse(cached);
            if (expiry > Date.now()) livePrices = data;
          } catch { /* ignore */ }
        }

        if (Object.keys(livePrices).length === 0) {
          // Single call: fetch top 250 coins with prices, then match by symbol
          try {
            const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false`, { headers });
            const markets: any[] = await r.json();
            markets.forEach((c: any) => {
              const sym = c.symbol?.toUpperCase();
              if (sym && c.current_price) livePrices[sym] = c.current_price;
            });
            localStorage.setItem(cacheKey, JSON.stringify({ data: livePrices, expiry: Date.now() + 300_000 }));
          } catch { /* fall through */ }

          // If still empty (rate limited), try individual search + fetch for unmatched symbols
          if (Object.keys(livePrices).length === 0) {
            for (const sym of symbols) {
              if (livePrices[sym.toUpperCase()]) continue;
              try {
                const sr = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(sym)}`, { headers });
                const sd = await sr.json();
                const match = sd.coins?.find((c: any) => c.symbol?.toUpperCase() === sym.toUpperCase()) || sd.coins?.[0];
                if (!match) continue;
                const cr = await fetch(`https://api.coingecko.com/api/v3/coins/${match.id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`, { headers });
                const cd = await cr.json();
                const price = cd?.market_data?.current_price?.usd;
                if (price) livePrices[sym.toUpperCase()] = price;
              } catch { /* skip */ }
            }
            if (Object.keys(livePrices).length > 0) {
              localStorage.setItem(cacheKey, JSON.stringify({ data: livePrices, expiry: Date.now() + 300_000 }));
            }
          }
        }

        let fearGreed = 50;
        try {
          const fgRes = await fetch('https://api.alternative.me/fng/?limit=1');
          const fgData = await fgRes.json();
          fearGreed = parseInt(fgData.data[0].value);
        } catch (e) { console.log("Fear/Greed fetch failed"); }

        const calculated = calculatePositions(txs as Transaction[], livePrices, fearGreed);
        setPositions(calculated);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) return <div className="p-4 text-slate-400">Loading portfolio...</div>;
  if (positions.length === 0) return <div className="p-4 text-slate-400">No transactions found. Add your first investment!</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">My Investment Portfolio</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {positions.map((pos, index) => (
          <div key={index} className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-700">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white">{pos.asset_symbol}</h3>
                <p className="text-slate-400 text-sm">Platform: {pos.platform || 'Unknown'}</p>
                <p className="text-slate-400 text-sm">Holdings: {pos.total_quantity.toFixed(6)} tokens</p>
                <p className="text-slate-400 text-sm">Total Invested: ${pos.total_invested_fiat.toFixed(2)}</p>
              </div>
              <button
                onClick={() => deleteSymbol(pos.asset_symbol)}
                disabled={deleting === pos.asset_symbol}
                className="self-start px-2 py-1 text-xs bg-red-900/50 hover:bg-red-800 text-red-300 rounded border border-red-700 disabled:opacity-50"
              >
                {deleting === pos.asset_symbol ? '…' : '✕'}
              </button>
              <div className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                pos.signal_color === 'lime' ? 'bg-lime-900/50 text-lime-300 border border-lime-600' :
                pos.signal_color === 'green' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                pos.signal_color === 'orange' ? 'bg-orange-900/50 text-orange-300 border border-orange-600' :
                pos.signal_color === 'red' ? 'bg-red-900/50 text-red-400 border border-red-700' :
                'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
              }`}>
                {pos.signal_label_bn}
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Current Value</span>
                <span className="text-xl font-bold text-white">${pos.current_value.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-slate-400">Unrealized P&L</span>
                <span className={`font-bold ${pos.unrealized_pnl_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pos.unrealized_pnl_usd >= 0 ? '+' : ''}${pos.unrealized_pnl_usd.toFixed(2)} ({pos.unrealized_pnl_percent.toFixed(2)}%)
                </span>
              </div>
            </div>

            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-400 mb-1 font-semibold uppercase">Market Context & Signal:</p>
              <p className="text-sm text-slate-200">{pos.signal_text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
