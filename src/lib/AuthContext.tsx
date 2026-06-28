import axios from 'axios'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface AuthState {
  token: string | null
  email: string | null
}

interface AuthContextValue extends AuthState {
  signup: (email: string, password: string) => Promise<string | null>
  login: (email: string, password: string) => Promise<string | null>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 'crypto-advisor-auth'

function load(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { token: null, email: null }
  } catch {
    return { token: null, email: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  async function signup(email: string, password: string): Promise<string | null> {
    try {
      const { data } = await axios.post('/api/auth/signup', { email, password })
      setState({ token: data.token, email: data.email })
      return null
    } catch (e) {
      return axios.isAxiosError(e) ? e.response?.data?.error ?? 'Signup failed' : 'Signup failed'
    }
  }

  async function login(email: string, password: string): Promise<string | null> {
    try {
      const { data } = await axios.post('/api/auth/login', { email, password })
      setState({ token: data.token, email: data.email })
      return null
    } catch (e) {
      return axios.isAxiosError(e) ? e.response?.data?.error ?? 'Login failed' : 'Login failed'
    }
  }

  function logout() {
    setState({ token: null, email: null })
  }

  const value = useMemo(() => ({ ...state, signup, login, logout }), [state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
