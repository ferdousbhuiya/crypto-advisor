import type { CoinAnalysis } from './scoring'

export type Verdict = 'BUY_NOW' | 'ACCUMULATE' | 'HOLD' | 'SELL_NOW' | 'CRITICAL'

export interface VerdictResult {
  verdict: Verdict
  label: string
  detail: string
}

function isCriticalBearish(a: CoinAnalysis): boolean {
  const overbought = (a.rsi ?? 0) > 80
  const rollingOver = (a.macd?.histogram ?? 0) < 0
  const crashing = a.change7d < -20 && (a.volatility ?? 0) > 12
  return (overbought && rollingOver) || crashing
}

function isCriticalOpportunity(a: CoinAnalysis): boolean {
  const oversold = (a.rsi ?? 100) < 20
  const turningUp = (a.macd?.histogram ?? -1) > 0
  return oversold && turningUp && a.volumeToMcap > 1
}

export function getVerdict(a: CoinAnalysis): VerdictResult {
  if (isCriticalBearish(a)) {
    return {
      verdict: 'CRITICAL',
      label: 'CRITICAL — DUMP RISK',
      detail: 'Extreme overbought + bearish MACD, or sharp 7d crash with high volatility. High risk of further drop.',
    }
  }
  if (isCriticalOpportunity(a)) {
    return {
      verdict: 'BUY_NOW',
      label: 'CRITICAL — BUY OPPORTUNITY',
      detail: 'Deeply oversold (RSI<20) with MACD turning bullish and decent liquidity. Classic rebound setup.',
    }
  }
  if (a.score >= 70) {
    return { verdict: 'BUY_NOW', label: 'BUY NOW', detail: 'Indicators aligned bullish across momentum, trend and liquidity.' }
  }
  if (a.score >= 55) {
    return { verdict: 'ACCUMULATE', label: 'ACCUMULATE', detail: 'Mildly bullish — reasonable to build a position gradually rather than all at once.' }
  }
  if (a.score >= 40) {
    return { verdict: 'HOLD', label: 'HOLD / WAIT', detail: 'Mixed signals — no strong edge either way right now.' }
  }
  return { verdict: 'SELL_NOW', label: 'SELL NOW', detail: 'Bearish trend, weak momentum, or low liquidity — risk outweighs reward.' }
}

export function holdingAction(v: VerdictResult): string {
  switch (v.verdict) {
    case 'CRITICAL':
      return 'Consider selling now — crash risk elevated.'
    case 'BUY_NOW':
      return 'Keep holding, consider adding more.'
    case 'ACCUMULATE':
      return 'Keep holding, small adds OK.'
    case 'HOLD':
      return 'Keep holding, no action needed.'
    case 'SELL_NOW':
      return 'Consider selling some or all — momentum against you.'
  }
}
