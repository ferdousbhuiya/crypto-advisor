import type { CoinSentiment } from './coingecko'

export type SentimentLean = 'bullish' | 'bearish' | 'neutral'

export function sentimentLean(s: CoinSentiment | null): SentimentLean {
  if (!s || s.up === null) return 'neutral'
  if (s.up >= 65) return 'bullish'
  if (s.up <= 35) return 'bearish'
  return 'neutral'
}

// Extra, independent signal (not price/indicator based): CoinGecko community
// votes — real people clicking "bullish" or "bearish" on the coin page.
// Shown in Bangla since that's where this app's advice/signal text lives.
export function sentimentSignal(s: CoinSentiment): string {
  if (s.up === null) {
    return 'এই কয়েনের জন্য এখনো পর্যাপ্ত কমিউনিটি ভোট নেই, তাই এই সিগন্যাল দেখানো যাচ্ছে না।'
  }
  const up = Math.round(s.up)
  const lean = sentimentLean(s)
  if (lean === 'bullish') {
    return `কমিউনিটির ${up}% মানুষ এই কয়েন নিয়ে পজিটিভ (bullish) ভোট দিয়েছে। এটা একটা ইতিবাচক সিগন্যাল, তবে শুধু এটার উপর ভরসা করে কেনা ঠিক না — টেকনিক্যাল স্কোরের সাথে মিলিয়ে দেখুন।`
  }
  if (lean === 'bearish') {
    return `কমিউনিটির মাত্র ${up}% মানুষ পজিটিভ ভোট দিয়েছে — বেশিরভাগ মানুষ এই কয়েন নিয়ে সন্দিহান। এটা একটু সতর্ক থাকার সিগন্যাল।`
  }
  return `কমিউনিটির ${up}% মানুষ পজিটিভ ভোট দিয়েছে — মতামত মোটামুটি ভাগ হয়ে আছে, স্পষ্ট কোনো দিক নেই।`
}
