// api/coingecko/coins/markets.ts
import { VercelRequest, VercelResponse } from 'vercel';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('vs_currency', 'usd');
    params.append('order', 'market_cap_desc');
    params.append('per_page', req.query.per_page?.toString() || '20');
    params.append('page', req.query.page?.toString() || '1');
    
    if (req.query.price_change_percentage) {
      params.append('price_change_percentage', '24h,7d');
    }
    
    if (req.query.ids) {
      params.append('ids', req.query.ids as string);
    }

    const url = `https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`;
    console.log('Fetching from CoinGecko:', url);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CryptoAdvisor/1.0',
      },
    });

    if (response.status === 429) {
      console.error('Rate limited by CoinGecko');
      return res.status(429).json({ error: 'Rate limited. Please wait.' });
    }

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in markets API:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch market data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}