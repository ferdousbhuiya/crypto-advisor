import axios from 'axios'

const API = '/api/coingecko'

export interface CoinMarket {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  total_volume: number
  high_24h: number
  low_24h: number
  price_change_percentage_24h: number
  price_change_percentage_7d_in_currency?: number
  circulating_supply: number
  total_supply: number | null
  ath: number
  ath_change_percentage: number
}

export async function fetchTopMarkets(limit = 50): Promise<CoinMarket[]> {
  const { data } = await axios.get<CoinMarket[]>(`${API}/coins/markets`, {
    params: {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: limit,
      page: 1,
      price_change_percentage: '24h,7d',
    },
  })
  return data
}

export async function fetchPriceHistory(
  id: string,
  days = 30,
): Promise<number[]> {
  const { data } = await axios.get<{ prices: [number, number][] }>(
    `${API}/coins/${id}/market_chart`,
    { params: { vs_currency: 'usd', days } },
  )
  return data.prices.map((p) => p[1])
}

export interface PricePoint {
  time: number
  price: number
}

export async function fetchPriceSeries(
  id: string,
  days: number,
): Promise<PricePoint[]> {
  const { data } = await axios.get<{ prices: [number, number][] }>(
    `${API}/coins/${id}/market_chart`,
    { params: { vs_currency: 'usd', days } },
  )
  return data.prices.map(([time, price]) => ({ time, price }))
}

export async function fetchMarketsByIds(ids: string[]): Promise<CoinMarket[]> {
  if (ids.length === 0) return []
  const { data } = await axios.get<CoinMarket[]>(`${API}/coins/markets`, {
    params: {
      vs_currency: 'usd',
      ids: ids.join(','),
      price_change_percentage: '24h,7d',
    },
  })
  return data
}

export interface CoinSearchResult {
  id: string
  name: string
  symbol: string
  thumb: string
}

export async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  if (!query.trim()) return []
  const { data } = await axios.get<{ coins: CoinSearchResult[] }>(`${API}/search`, {
    params: { query },
  })
  return data.coins.slice(0, 8)
}

export interface CoinSentiment {
  up: number | null
  down: number | null
}

export async function fetchCoinSentiment(id: string): Promise<CoinSentiment | null> {
  try {
    const { data } = await axios.get<{
      sentiment_votes_up_percentage: number | null
      sentiment_votes_down_percentage: number | null
    }>(`${API}/coins/${id}`)
    if (data.sentiment_votes_up_percentage == null && data.sentiment_votes_down_percentage == null) return null
    return { up: data.sentiment_votes_up_percentage, down: data.sentiment_votes_down_percentage }
  } catch {
    return null
  }
}

export interface FearGreed {
  value: number
  classification: string
}

export async function fetchFearGreedIndex(): Promise<FearGreed> {
  const { data } = await axios.get<{ data: { value: string; value_classification: string }[] }>(
    `${API}/fear-greed`,
  )
  const entry = data.data[0]
  return { value: Number(entry.value), classification: entry.value_classification }
}
