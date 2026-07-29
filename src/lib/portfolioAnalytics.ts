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
  signal_text: string;
  signal_color: 'green' | 'yellow' | 'red';
}
console.log("Loaded portfolioAnalytics.ts");

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

    let signal_text = "HOLD: No extreme signals.";
    let signal_color: 'green' | 'yellow' | 'red' = 'yellow';

    if (currentPrice > 0 && totalInvested > 0) {
      if (pnlPercent > 50 && fearGreedIndex > 75) {
        signal_text = "CAUTION: High unrealized profit (>50%) combined with Extreme Market Greed. Consider taking partial profits.";
        signal_color = 'red';
      } else if (pnlPercent < -20) {
        signal_text = "REVIEW: Position is down >20%. Evaluate if the fundamental thesis has changed.";
        signal_color = 'red';
      } else if (pnlPercent > 20) {
        signal_text = "STRONG: Position is performing well. Ensure it doesn't overweight your portfolio.";
        signal_color = 'green';
      } else if (fearGreedIndex < 25) {
        signal_text = "OPPORTUNITY: Market is in Extreme Fear. Historically a strong accumulation zone.";
        signal_color = 'green';
      }
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
      signal_text,
      signal_color
    };
  });
}