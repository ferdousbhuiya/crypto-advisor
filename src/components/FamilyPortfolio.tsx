import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Transaction } from '../lib/supabase';
import { calculatePositions } from '../lib/portfolioAnalytics';
import type { PositionData } from '../lib/portfolioAnalytics';

export default function FamilyPortfolio() {
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Common symbols → CoinGecko ID (avoids fetching 15K+ list)
        const SYM_TO_ID: Record<string, string> = {
          BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
          XRP: 'ripple', ADA: 'cardano', DOT: 'polkadot', DOGE: 'dogecoin',
          AVAX: 'avalanche-2', MATIC: 'matic-network', LINK: 'chainlink',
          UNI: 'uniswap', ATOM: 'cosmos', LTC: 'litecoin', BCH: 'bitcoin-cash',
          ALGO: 'algorand', FIL: 'filecoin', TRX: 'tron', XLM: 'stellar',
          VET: 'vechain', ICP: 'internet-computer', NEAR: 'near', APT: 'aptos',
          ZEC: 'zcash', ZCASH: 'zcash', ZEN: 'zencash', DASH: 'dash', ETC: 'ethereum-classic',
          XMR: 'monero', YFI: 'yearn-finance', SNX: 'synthetix-network-token',
          MKR: 'maker', AAVE: 'aave', COMP: 'compound-governance-token',
          SUSHI: 'sushi', CRV: 'curve-dao-token', '1INCH': '1inch',
          ENJ: 'enjincoin', MANA: 'decentraland', SAND: 'the-sandbox',
          AXS: 'axie-infinity', SHIB: 'shiba-inu', FTM: 'fantom',
          HBAR: 'hedera-hashgraph', EOS: 'eos', NEO: 'neo', IOTA: 'iota',
          XTZ: 'tezos', RUNE: 'thorchain', KSM: 'kusama', FLOW: 'flow',
          STX: 'stacks', QNT: 'quant-network', CHZ: 'chiliz', GALA: 'gala',
          THETA: 'theta-token', TFUEL: 'theta-fuel', AR: 'arweave',
          HNT: 'helium', BAT: 'basic-attention-token', ZIL: 'zilliqa',
          WAVES: 'waves', ONT: 'ontology', ICX: 'icon', OMG: 'omisego',
          LRC: 'loopring', ZRX: '0x', SC: 'siacoin', DGB: 'digibyte'
        };

        const headers: Record<string, string> = {};
        const cgKey = import.meta.env.VITE_COINGECKO_API_KEY || '';
        if (cgKey) headers['x-cg-demo-api-key'] = cgKey;

        try {
          const coinIds = symbols.map((s: string) => SYM_TO_ID[s.toUpperCase()] || '').filter(Boolean).join(',');

          const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`, { headers });
          const priceData: Record<string, { usd: number }> = await priceRes.json();

          const livePrices: Record<string, number> = {};
          symbols.forEach((sym: string) => {
            const id = SYM_TO_ID[sym.toUpperCase()];
            if (id && priceData[id]) livePrices[sym.toUpperCase()] = priceData[id].usd;
          });

          let fearGreed = 50;
          try {
            const fgRes = await fetch('https://api.alternative.me/fng/?limit=1');
            const fgData = await fgRes.json();
            fearGreed = parseInt(fgData.data[0].value);
          } catch (e) { console.log("Fear/Greed fetch failed"); }

          const calculated = calculatePositions(txs as Transaction[], livePrices, fearGreed);
          setPositions(calculated);
        } catch (err) {
          console.error("Error fetching live prices:", err);
          const mockLivePrices: Record<string, number> = { 'BTC': 68000, 'ETH': 3800, 'SOL': 150, 'ZEC': 30 };
          setPositions(calculatePositions(txs as Transaction[], mockLivePrices, 50));
        }
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
              <div>
                <h3 className="text-2xl font-bold text-white">{pos.asset_symbol}</h3>
                <p className="text-slate-400 text-sm">Platform: {pos.platform || 'Unknown'}</p>
                <p className="text-slate-400 text-sm">Holdings: {pos.total_quantity.toFixed(6)}</p>
              </div>
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
