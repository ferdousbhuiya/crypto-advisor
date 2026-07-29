export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null
  const slice = values.slice(values.length - period)
  return slice.reduce((a, b) => a + b, 0) / period
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null
  const k = 2 / (period + 1)
  let emaVal = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k)
  }
  return emaVal
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null
  let gains = 0
  let losses = 0
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export function macd(
  values: number[],
): { macd: number; signal: number; histogram: number } | null {
  if (values.length < 26) return null
  const emaSeries = (period: number) => {
    const k = 2 / (period + 1)
    const out: number[] = []
    let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
    out[period - 1] = prev
    for (let i = period; i < values.length; i++) {
      prev = values[i] * k + prev * (1 - k)
      out[i] = prev
    }
    return out
  }
  const ema12 = emaSeries(12)
  const ema26 = emaSeries(26)
  const macdLine: number[] = []
  for (let i = 0; i < values.length; i++) {
    if (ema12[i] !== undefined && ema26[i] !== undefined) {
      macdLine[i] = ema12[i] - ema26[i]
    }
  }
  const macdValues = macdLine.filter((v) => v !== undefined)
  if (macdValues.length < 9) return null
  const k9 = 2 / (9 + 1)
  let signal = macdValues.slice(0, 9).reduce((a, b) => a + b, 0) / 9
  for (let i = 9; i < macdValues.length; i++) {
    signal = macdValues[i] * k9 + signal * (1 - k9)
  }
  const latestMacd = macdValues[macdValues.length - 1]
  return { macd: latestMacd, signal, histogram: latestMacd - signal }
}

export function volatility(values: number[]): number | null {
  if (values.length < 2) return null
  const returns: number[] = []
  for (let i = 1; i < values.length; i++) {
    returns.push((values[i] - values[i - 1]) / values[i - 1])
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance) * 100
}
