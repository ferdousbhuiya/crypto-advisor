import axios from 'axios'
import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

export interface Holding {
  coinId: string
  symbol: string
  name: string
  amount: number
}

const STORAGE_KEY = 'crypto-advisor-holdings'

function loadLocal(): Holding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function usePortfolio() {
  const { token } = useAuth()
  const [holdings, setHoldings] = useState<Holding[]>(loadLocal)
  const [loaded, setLoaded] = useState(!token)

  useEffect(() => {
    if (!token) {
      setHoldings(loadLocal())
      setLoaded(true)
      return
    }
    setLoaded(false)
    axios
      .get<Holding[]>('/api/holdings', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setHoldings(data))
      .finally(() => setLoaded(true))
  }, [token])

  useEffect(() => {
    if (!token) localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
  }, [holdings, token])

  async function addHolding(h: Holding) {
    if (!token) {
      setHoldings((prev) => {
        const existing = prev.find((p) => p.coinId === h.coinId)
        if (existing) {
          return prev.map((p) => (p.coinId === h.coinId ? { ...p, amount: p.amount + h.amount } : p))
        }
        return [...prev, h]
      })
      return
    }
    const { data } = await axios.post<Holding>('/api/holdings', h, {
      headers: { Authorization: `Bearer ${token}` },
    })
    setHoldings((prev) => {
      const without = prev.filter((p) => p.coinId !== data.coinId)
      return [...without, data]
    })
  }

  async function removeHolding(coinId: string) {
    if (!token) {
      setHoldings((prev) => prev.filter((p) => p.coinId !== coinId))
      return
    }
    await axios.delete(`/api/holdings/${coinId}`, { headers: { Authorization: `Bearer ${token}` } })
    setHoldings((prev) => prev.filter((p) => p.coinId !== coinId))
  }

  return { holdings, addHolding, removeHolding, loaded }
}
