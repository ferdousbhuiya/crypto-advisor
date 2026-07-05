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

// Advice/signal text is shown in Bangla since that's the language most of
// this app's users read.
export function getVerdict(a: CoinAnalysis): VerdictResult {
  if (isCriticalBearish(a)) {
    return {
      verdict: 'CRITICAL',
      label: 'সতর্কতা — দ্রুত দরপতনের ঝুঁকি',
      detail: 'RSI অতিরিক্ত বেশি (overbought) এবং MACD নেগেটিভ হয়ে যাচ্ছে, অথবা ৭ দিনে বড় দরপতন ও উচ্চ volatility দেখা যাচ্ছে। সামনে আরো দাম পড়ার ঝুঁকি বেশি।',
    }
  }
  if (isCriticalOpportunity(a)) {
    return {
      verdict: 'BUY_NOW',
      label: 'এখনই কেনার সুযোগ',
      detail: 'RSI অনেক কম (oversold) কিন্তু MACD পজিটিভের দিকে ঘুরছে এবং লিকুইডিটি ভালো। এটা সাধারণত দাম আবার ওঠার আগের চিহ্ন।',
    }
  }
  if (a.score >= 70) {
    return { verdict: 'BUY_NOW', label: 'এখনই কিনুন', detail: 'মোমেন্টাম, ট্রেন্ড আর লিকুইডিটি — সবকিছু পজিটিভের দিকে ইঙ্গিত করছে।' }
  }
  if (a.score >= 55) {
    return { verdict: 'ACCUMULATE', label: 'ধীরে ধীরে কিনুন', detail: 'হালকা পজিটিভ সিগন্যাল — একবারে সব টাকা না লাগিয়ে ধাপে ধাপে কেনা ভালো হবে।' }
  }
  if (a.score >= 40) {
    return { verdict: 'HOLD', label: 'অপেক্ষা করুন', detail: 'সিগন্যাল মিশ্র — এখন কোনো পক্ষেই স্পষ্ট সুবিধা নেই।' }
  }
  return { verdict: 'SELL_NOW', label: 'এখন বিক্রি করে দিন', detail: 'ট্রেন্ড নেগেটিভ, মোমেন্টাম দুর্বল অথবা লিকুইডিটি কম — ঝুঁকি সম্ভাবনার চেয়ে বেশি।' }
}

export function holdingAction(v: VerdictResult): string {
  switch (v.verdict) {
    case 'CRITICAL':
      return 'বিক্রি করার কথা ভাবুন — দাম পড়ার ঝুঁকি বেশি।'
    case 'BUY_NOW':
      return 'ধরে রাখুন, চাইলে আরো কিনতে পারেন।'
    case 'ACCUMULATE':
      return 'ধরে রাখুন, অল্প অল্প করে আরো কেনা যেতে পারে।'
    case 'HOLD':
      return 'ধরে রাখুন, এখন কিছু করার দরকার নেই।'
    case 'SELL_NOW':
      return 'কিছু বা সবটা বিক্রি করার কথা ভাবুন — মোমেন্টাম বিপক্ষে যাচ্ছে।'
  }
}
