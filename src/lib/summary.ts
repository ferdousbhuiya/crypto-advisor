import type { CoinAnalysis } from './scoring'
import { getVerdict } from './verdict'
import type { FearGreed } from './coingecko'

// All advice/signal text below is in Bangla — most of this app's users read
// Bangla, and this is the plain-language "what should I do" section.

function plainMomentum(a: CoinAnalysis): string {
  if (a.change7d > 5) return 'গত এক সপ্তাহে বেশ ভালোভাবে উপরে উঠেছে'
  if (a.change7d > 0) return 'গত এক সপ্তাহে সামান্য উপরে উঠেছে'
  if (a.change7d > -5) return 'গত এক সপ্তাহে মোটামুটি স্থির ছিল'
  if (a.change7d > -15) return 'গত এক সপ্তাহে নিচের দিকে নেমেছে'
  return 'গত এক সপ্তাহে বড়সড় দরপতন হয়েছে'
}

function plainRsi(a: CoinAnalysis): string | null {
  if (a.rsi === null) return null
  if (a.rsi < 20) return 'এত বেশি বিক্রি হয়ে গেছে যে এখন দাম আবার উঠতে পারে'
  if (a.rsi < 35) return 'সাম্প্রতিক রেঞ্জের তুলনায় দাম এখন কিছুটা সস্তা'
  if (a.rsi > 80) return 'এত দ্রুত কেনা হয়েছে যে এখন দাম কিছুটা কমতে পারে'
  if (a.rsi > 65) return 'সাম্প্রতিক রেঞ্জের তুলনায় দাম এখন কিছুটা বেশি'
  return 'দাম স্বাভাবিক রেঞ্জেই আছে, কোনো চরম অবস্থা নেই'
}

function plainLiquidity(a: CoinAnalysis): string {
  if (a.volumeToMcap < 1) return 'সতর্কতা: ট্রেডিং ভলিউম কম, তাই দাম হঠাৎ বেশি ওঠানামা করতে পারে এবং দ্রুত বিক্রি করা কঠিন হতে পারে।'
  if (a.volumeToMcap > 10) return 'এখন ভালো পরিমাণে ট্রেড হচ্ছে, তাই কেনা-বেচায় সমস্যা হওয়ার কথা না।'
  return ''
}

export function plainExplanation(a: CoinAnalysis): string {
  const parts = [
    `${a.coin.name} ${plainMomentum(a)}।`,
    plainRsi(a) ? `এখন এই কয়েনের ক্ষেত্রে, ${plainRsi(a)}।` : '',
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
    return `Fear & Greed ইনডেক্স: ${fg.value}/100 (${fg.classification})। মানুষ এখন ভয় পাচ্ছে — ইতিহাস বলে চরম ভয়ের সময়ই প্রায়ই ভালো কেনার সুযোগ আসে, কিন্তু দাম আরো কমতেও পারে। শুধু এটার উপর ভরসা করে সব টাকা লাগাবেন না।`
  }
  if (fg.value >= 75) {
    return `Fear & Greed ইনডেক্স: ${fg.value}/100 (${fg.classification})। মানুষ এখন খুব উত্তেজিত — এর মানে দাম বেশি বেড়ে গেছে এবং শীঘ্রই কিছুটা কমার সম্ভাবনা বেশি।`
  }
  return `Fear & Greed ইনডেক্স: ${fg.value}/100 (${fg.classification})। বাজারের মনোভাব মোটামুটি ভারসাম্যপূর্ণ, স্পষ্ট কেনা বা বেচার সংকেত নেই।`
}

export function buildDailySummary(analyses: CoinAnalysis[], fg: FearGreed | null = null): DailySummary {
  if (analyses.length === 0) {
    return {
      mood: 'neutral',
      moodSentence: 'বাজারের তথ্য এখনো লোড হচ্ছে।',
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
      ? 'সবমিলিয়ে, এই সপ্তাহটা বাজারের জন্য ভালো গেছে — বেশিরভাগ কয়েনের দাম বেড়েছে।'
      : mood === 'bearish'
        ? 'সবমিলিয়ে, এই সপ্তাহটা বাজারের জন্য খারাপ গেছে — বেশিরভাগ কয়েনের দাম কমেছে।'
        : 'সবমিলিয়ে, এই সপ্তাহে বাজার মিশ্র ছিল — স্পষ্ট কোনো দিক নেই।'

  const candidates = analyses
    .map((a) => ({ a, v: getVerdict(a) }))
    .filter(({ v }) => v.verdict === 'BUY_NOW' || v.verdict === 'ACCUMULATE')
    .sort((x, y) => y.a.score - x.a.score)

  const pick = candidates[0]?.a ?? null
  const pickVerdict = candidates[0]?.v ?? null

  const pickSentence = pick
    ? `${pick.coin.name} (${pick.coin.symbol.toUpperCase()}) এখন সবচেয়ে ভালো অপশন মনে হচ্ছে। ${plainExplanation(pick)} ${pickVerdict?.verdict === 'BUY_NOW' ? 'কিছু কেনার পরিকল্পনা থাকলে এখনই কেনার মতো ভালো সময়।' : 'একবারে সব না লাগিয়ে ধীরে ধীরে পজিশন তৈরি করাই ভালো।'}`
    : 'আজকের তালিকায় কোনো কয়েনই আত্মবিশ্বাসের সাথে কেনার মতো জায়গায় নেই। এখন সবচেয়ে ভালো হলো অপেক্ষা করা আর পরে আবার দেখা — স্পষ্ট সুবিধা ছাড়া কেনা মানে শুধু আন্দাজে টাকা লাগানো।'

  const avoid = analyses.filter((a) => getVerdict(a).verdict === 'CRITICAL' && getVerdict(a).label.includes('দরপতন')).slice(0, 2)

  return { mood, moodSentence, pick, pickSentence, avoid, fearGreedSentence: fearGreedSentence(fg) }
}
