import axios from 'axios'
import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

export interface Holding {
  id: string
  coinId: string
  symbol: string
  name: string
  amount: number
  purchasePrice: number
  purchaseDate: string
  platform: string
}

export type NewHolding = Omit<Holding, 'id'>

export function usePortfolio() {
  const { token } = useAuth()
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      // No account signed in: no holdings are shown or stored anywhere.
      setHoldings([])
      setLoaded(true)
      return
    }
    setHoldings([])
    setLoaded(false)
    axios
      .get<Holding[]>('/api/holdings', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setHoldings(data))
      .finally(() => setLoaded(true))
  }, [token])

  async function addHolding(h: NewHolding): Promise<string | null> {
    if (!token) return 'Sign in first'
    try {
      const { data } = await axios.post<Holding>('/api/holdings', h, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setHoldings((prev) => [data, ...prev])
      setError(null)
      return null
    } catch (e) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.error ?? 'Could not add holding' : 'Could not add holding'
      setError(msg)
      return msg
    }
  }

  async function removeHolding(id: string) {
    if (!token) return
    await axios.delete(`/api/holdings/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    setHoldings((prev) => prev.filter((p) => p.id !== id))
  }

  return { holdings, addHolding, removeHolding, loaded, error }
}
