import Redis from 'ioredis'

// Optional Redis-backed cache for the CoinGecko proxy. Without this, every
// server restart (every deploy) wipes the in-memory cache and the very next
// page load has to make ~21 fresh upstream requests at once, which is
// exactly what trips CoinGecko's free-tier rate limit. Redis persists
// across restarts so a redeploy doesn't force everyone back to a cold,
// rate-limited start.
//
// This is intentionally optional: if REDIS_URL isn't set (or the connection
// fails), everything falls back to the in-memory cache in proxy.ts and the
// app keeps working exactly as before.
const redisUrl = process.env.REDIS_URL

let client: Redis | null = null

if (redisUrl) {
  client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    reconnectOnError: () => false,
  })
  client.on('error', (err) => {
    console.warn('[redis] connection issue, continuing without Redis cache:', err.message)
  })
  client.connect().catch((err) => {
    console.warn('[redis] failed to connect, continuing without Redis cache:', err.message)
    client = null
  })
}

export async function redisGet<T>(key: string): Promise<T | null> {
  if (!client || client.status !== 'ready') return null
  try {
    const raw = await client.get(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export async function redisSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!client || client.status !== 'ready') return
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch {
    // best-effort only — in-memory cache in proxy.ts still covers this request
  }
}
