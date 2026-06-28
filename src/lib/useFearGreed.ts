import { useEffect, useState } from 'react'
import { fetchFearGreedIndex, type FearGreed } from './coingecko'

export function useFearGreed() {
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null)

  useEffect(() => {
    fetchFearGreedIndex()
      .then(setFearGreed)
      .catch(() => setFearGreed(null))
  }, [])

  return fearGreed
}
