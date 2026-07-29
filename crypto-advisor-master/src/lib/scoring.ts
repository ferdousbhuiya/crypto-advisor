import type { CoinMarket } from './coingecko'
import { ema, macd, rsi, sma, volatility } from './indicators'

export interface CoinAnalysis {
  coin: CoinMarket
  rsi: number | null
  sma7: number | null
  sma25: number | null
  ema12: number | null
  macd: { macd: number; signal: number; histogram: number } | null
  volatility: number | null
  change24h: number
  change7d: number
  athDrawdown: number
  volumeToMcap: number
  score: number
  signal: 'BUY' | 'WATCH' | 'AVOID'
  reasons: string[]
}

export function analyzeCoin(coin: CoinMarket, priceHistory: number[]): CoinAnalysis {
  const r = rsi(priceHistory, 14)
  const s7 = sma(priceHistory, 7)
  const s25 = sma(priceHistory, 25)
  const e12 = ema(priceHistory, 12)
  const m = macd(priceHistory)
  const vol = volatility(priceHistory)
  const change24h = coin.price_change_percentage_24h ?? 0
  const change7d = coin.price_change_percentage_7d_in_currency ?? 0
  const athDrawdown = coin.ath_change_percentage ?? 0
  const volumeToMcap = coin.market_cap > 0 ? (coin.total_volume / coin.market_cap) * 100 : 0

  const reasons: string[] = []
  let score = 50

  if (r !== null) {
    if (r < 30) {
      score += 15
      reasons.push(`RSI ${r.toFixed(0)} oversold, possible rebound`)
    } else if (r > 70) {
      score -= 15
      reasons.push(`RSI ${r.toFixed(0)} overbought, pullback risk`)
    }
  }

  if (m !== null) {
    if (m.histogram > 0) {
      score += 10
      reasons.push('MACD bullish crossover')
    } else {
      score -= 5
      reasons.push('MACD bearish')
    }
  }

  if (s7 !== null && s25 !== null) {
    if (s7 > s25) {
      score += 10
      reasons.push('short-term trend above long-term (golden cross zone)')
    } else {
      score -= 10
      reasons.push('short-term trend below long-term')
    }
  }

  if (change7d > 0 && change24h > 0) {
    score += 5
    reasons.push('positive momentum 24h and 7d')
  } else if (change7d < 0 && change24h < 0) {
    score -= 5
    reasons.push('negative momentum 24h and 7d')
  }

  if (volumeToMcap > 10) {
    score += 5
    reasons.push('high liquidity (volume/mcap > 10%)')
  } else if (volumeToMcap < 1) {
    score -= 10
    reasons.push('low liquidity, risky to enter/exit')
  }

  if (athDrawdown < -70) {
    score += 5
    reasons.push('deep discount from all-time high')
  }

  if (vol !== null && vol > 8) {
    score -= 5
    reasons.push('high volatility, higher risk')
  }

  score = Math.max(0, Math.min(100, score))
  const signal: CoinAnalysis['signal'] = score >= 65 ? 'BUY' : score >= 45 ? 'WATCH' : 'AVOID'

  return {
    coin,
    rsi: r,
    sma7: s7,
    sma25: s25,
    ema12: e12,
    macd: m,
    volatility: vol,
    change24h,
    change7d,
    athDrawdown,
    volumeToMcap,
    score,
    signal,
    reasons,
  }
}

function isStablecoin(coin: CoinMarket): boolean {
  const priceNearDollar = coin.current_price > 0.98 && coin.current_price < 1.02
  const flat24h = Math.abs(coin.price_change_percentage_24h ?? 0) < 0.5
  const flat7d = Math.abs(coin.price_change_percentage_7d_in_currency ?? 0) < 1
  return priceNearDollar && flat24h && flat7d
}

export function rankCoins(analyses: CoinAnalysis[]): CoinAnalysis[] {
  return [...analyses]
    .filter((a) => !isStablecoin(a.coin))
    .sort((a, b) => b.score - a.score)
}
