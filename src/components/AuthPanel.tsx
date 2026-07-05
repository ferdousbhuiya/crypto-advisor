import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

export function AuthPanel() {
  const { token, email, login, signup, logout } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (token) {
    return (
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-slate-300 mb-4">
        <span>
          Signed in as <span className="text-white font-medium break-all">{email}</span>
        </span>
        <button
          onClick={() => {
            logout()
            setForm({ email: '', password: '' })
            setError(null)
          }}
          className="text-slate-500 hover:text-red-400"
        >
          log out
        </button>
      </div>
    )
  }

  async function submit() {
    setError(null)
    setBusy(true)
    const action = mode === 'login' ? login : signup
    const err = await action(form.email, form.password)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-6">
      <p className="text-sm text-slate-400 mb-2">
        Sign in to save your holdings to your account (instead of just this browser).
      </p>
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full sm:w-48"
        />
        <input
          type="password"
          placeholder="Password (8+ chars)"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full sm:w-48"
        />
        <button
          onClick={submit}
          disabled={busy || !form.email || !form.password}
          className="bg-purple-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm px-3 py-2 sm:py-1 rounded w-full sm:w-auto"
        >
          {busy ? 'Working…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        <button
          onClick={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))}
          className="text-slate-400 hover:text-white text-sm text-center sm:text-left"
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  )
}
