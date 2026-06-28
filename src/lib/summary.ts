import type { CoinAnalysis } from './scoring'
import { getVerdict } from './verdict'
import type { FearGreed } from './coingecko'

function plainMomentum(a: CoinAnalysis): string {
  if (a.change7d > 5) return 'has been climbing strongly over the past week'
  if (a.change7d > 0) return 'has edged up a little over the past week'
  if (a.change7d > -5) return 'has been roughly flat over the past week'
  if (a.change7d > -15) return 'has been sliding down over the past week'
  return 'has dropped sharply over the past week'
}

function plainRsi(a: CoinAnalysis): string | null {
  if (a.rsi === null) return null
  if (a.rsi < 20) return "it's been sold off so hard it may be due for a bounce"
  if (a.rsi < 35) return "it's on the cheaper side compared to its recent range"
  if (a.rsi > 80) return "it's been bought up so fast it may be due for a pullback"
  if (a.rsi > 65) return "it's trading toward the expensive end of its recent range"
  return "it's trading in a normal range, nothing extreme"
}

function plainLiquidity(a: CoinAnalysis): string {
  if (a.volumeToMcap < 1) return 'Heads up: trading volume is thin, so prices can swing harder and it can be harder to sell quickly.'
  if (a.volumeToMcap > 10) return "It's trading heavily right now, so buying or selling shouldn't be a problem."
  return ''
}

export function plainExplanation(a: CoinAnalysis): string {
  const parts = [
    `${a.coin.name} ${plainMomentum(a)}.`,
    plainRsi(a) ? `Right now, ${plainRsi(a)}.` : '',
    plainLiquidity(a),
  ].filter(Boolean)
  return parts.join(' ')
}

export interface DailySummary {
  mood: 'bullish' | 'neutral' | 'bearish'
  moodSentence: string
  pick: CoinAnalysis | null
  pickSentence: string
  avoid: CoinAnalysis[]
  fearGreedSentence: string
}

function fearGreedSentence(fg: FearGreed | null): string {
  if (!fg) return ''
  if (fg.value <= 25) {
    return `Fear & Greed Index: ${fg.value}/100 (${fg.classification}). Investors are scared right now — history shows extreme fear is often when good buys appear, but it can also keep dropping. Don't bet the farm on this alone.`
  }
  if (fg.value >= 75) {
    return `Fear & Greed Index: ${fg.value}/100 (${fg.classification}). Investors are very excited right now — that often means prices are stretched and a pullback is more likely soon.`
  }
  return `Fear & Greed Index: ${fg.value}/100 (${fg.classification}). Sentiment is fairly balanced, not screaming buy or sell.`
}

export function buildDailySummary(analyses: CoinAnalysis[], fg: FearGreed | null = null): DailySummary {
  if (analyses.length === 0) {
    return {
      mood: 'neutral',
      moodSentence: 'Still loading market data.',
      pick: null,
      pickSentence: '',
      avoid: [],
      fearGreedSentence: '',
    }
  }

  const avgChange7d = analyses.reduce((s, a) => s + a.change7d, 0) / analyses.length
  const mood: DailySummary['mood'] = avgChange7d > 3 ? 'bullish' : avgChange7d < -3 ? 'bearish' : 'neutral'
  const moodSentence =
    mood === 'bullish'
      ? "Overall, the market's had a good week — most coins are up."
      : mood === 'bearish'
        ? "Overall, the market's had a rough week — most coins are down."
        : "Overall, the market's been mixed this week — no clear direction."

  const candidates = analyses
    .map((a) => ({ a, v: getVerdict(a) }))
    .filter(({ v }) => v.verdict === 'BUY_NOW' || v.verdict === 'ACCUMULATE')
    .sort((x, y) => y.a.score - x.a.score)

  const pick = candidates[0]?.a ?? null
  const pickVerdict = candidates[0]?.v ?? null

  const pickSentence = pick
    ? `${pick.coin.name} (${pick.coin.symbol.toUpperCase()}) looks like the strongest option right now. ${plainExplanation(pick)} ${pickVerdict?.verdict === 'BUY_NOW' ? "It's worth buying now if you were going to buy something." : 'Worth slowly building a position rather than going all-in.'}`
    : "Nothing in today's list clears the bar for a confident buy. Best move is to wait and check back — buying into a coin with no clear edge is just a guess."

  const avoid = analyses.filter((a) => getVerdict(a).verdict === 'CRITICAL' && getVerdict(a).label.includes('DUMP')).slice(0, 2)

  return { mood, moodSentence, pick, pickSentence, avoid, fearGreedSentence: fearGreedSentence(fg) }
}
