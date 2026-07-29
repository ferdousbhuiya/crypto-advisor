import type { Transaction } from './supabase';

export interface PositionData {
  asset_symbol: string;
  platform: string;
  total_quantity: number;
  average_buy_price: number;
  total_invested_fiat: number;
  current_price: number;
  current_value: number;
  unrealized_pnl_usd: number;
  unrealized_pnl_percent: number;
  signal_label: 'STRONG BUY' | 'BUY' | 'ACCUMULATE' | 'HOLD' | 'SELL' | 'STRONG SELL';
  signal_color: 'green' | 'yellow' | 'red' | 'lime' | 'orange';
  signal_text: string;
}

export function calculatePositions(
  transactions: Transaction[],
  livePrices: Record<string, number>,
  fearGreedIndex: number
): PositionData[] {
  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach(tx => {
    const key = `${tx.asset_symbol}_${tx.platform || 'Unknown'}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tx);
  });

  return Object.entries(grouped).map(([key, txs]) => {
    const [asset_symbol, platform] = key.split('_');
    let totalQty = 0;
    let totalInvested = 0;

    txs.forEach(tx => {
      const qty = parseFloat(tx.quantity);
      const fiat = parseFloat(tx.fiat_value);
      if (tx.transaction_type === 'BUY' || tx.transaction_type === 'TRANSFER_IN') {
        totalQty += qty;
        totalInvested += fiat;
      } else if (tx.transaction_type === 'SELL' || tx.transaction_type === 'TRANSFER_OUT') {
        totalQty -= qty;
        totalInvested -= fiat;
      }
    });

    const avgBuyPrice = totalQty > 0 ? totalInvested / totalQty : 0;
    const currentPrice = livePrices[asset_symbol] || 0;
    const currentValue = totalQty * currentPrice;
    const pnlUsd = currentValue - totalInvested;
    const pnlPercent = totalInvested > 0 ? (pnlUsd / totalInvested) * 100 : 0;

    let signal_label: PositionData['signal_label'] = 'HOLD';
    let signal_color: PositionData['signal_color'] = 'yellow';
    let signal_text = "HOLD: No extreme signals.";

    if (currentPrice <= 0 || !currentPrice) {
      signal_label = 'HOLD';
      signal_color = 'yellow';
      signal_text = "NO DATA: Price data unavailable. Check symbol or try again later.";
    } else if (pnlPercent > 100 && fearGreedIndex > 80) {
      signal_label = 'STRONG SELL';
      signal_color = 'red';
      signal_text = "⚠️ GAIN >100% + Extreme Greed. Take profits aggressively.";
    } else if (pnlPercent > 50 && fearGreedIndex > 75) {
      signal_label = 'SELL';
      signal_color = 'orange';
      signal_text = "HIGH GAIN + Greed. Consider taking partial profits now.";
    } else if (pnlPercent > 30 && fearGreedIndex > 70) {
      signal_label = 'ACCUMULATE';
      signal_color = 'lime';
      signal_text = "Nice gain. Could trim small position, but trend still healthy.";
    } else if (pnlPercent > 20) {
      signal_label = 'HOLD';
      signal_color = 'green';
      signal_text = "Position performing well. Let winners run.";
    } else if (pnlPercent < -40 && fearGreedIndex < 20) {
      signal_label = 'STRONG BUY';
      signal_color = 'lime';
      signal_text = "🔥 Down >40% + Extreme Fear. Historically best accumulation zone.";
    } else if (pnlPercent < -30 && fearGreedIndex < 30) {
      signal_label = 'BUY';
      signal_color = 'green';
      signal_text = "Down >30% + Fear. DCA into this position — high reward potential.";
    } else if (pnlPercent < -20) {
      signal_label = 'ACCUMULATE';
      signal_color = 'lime';
      signal_text = "Position down >20%. If thesis intact, this is a dip-buy opportunity.";
    } else if (pnlPercent < -10) {
      signal_label = 'HOLD';
      signal_color = 'yellow';
      signal_text = "Slight dip. Monitor but no action needed yet.";
    } else if (fearGreedIndex < 25) {
      signal_label = 'BUY';
      signal_color = 'green';
      signal_text = "Market in Extreme Fear — strong accumulation zone historically.";
    } else if (fearGreedIndex > 75) {
      signal_label = 'SELL';
      signal_color = 'orange';
      signal_text = "Market in Extreme Greed. Consider reducing exposure.";
    }

    return {
      asset_symbol,
      platform,
      total_quantity: totalQty,
      average_buy_price: avgBuyPrice,
      total_invested_fiat: totalInvested,
      current_price: currentPrice,
      current_value: currentValue,
      unrealized_pnl_usd: pnlUsd,
      unrealized_pnl_percent: pnlPercent,
      signal_label,
      signal_color,
      signal_text
    };
  });
}