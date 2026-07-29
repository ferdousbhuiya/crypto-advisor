// api/coingecko/search.ts
import { VercelRequest, VercelResponse } from 'vercel';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query parameter is required' });
  }

  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
    console.log('Searching CoinGecko:', url);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CryptoAdvisor/1.0',
      },
    });

    if (response.status === 429) {
      return res.status(429).json({ error: 'Rate limited. Please wait.' });
    }

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in search API:', error);
    return res.status(500).json({ 
      error: 'Failed to search coins',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}