// src/components/AuthPanel.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="w-full space-y-4 bg-slate-900 p-6 rounded-lg border border-slate-700">
      <h2 className="text-xl font-bold text-white text-center">Secure Family Login</h2>
      {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-2 rounded text-sm text-center">{error}</div>}
      <input 
        type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} 
        className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white placeholder-slate-400" required 
      />
      <input 
        type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} 
        className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white placeholder-slate-400" required 
      />
      <button 
        type="submit" disabled={loading} 
        className="w-full p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 rounded font-semibold text-white transition-colors"
      >
        {loading ? 'Authenticating...' : 'Sign In'}
      </button>
      <p className="text-xs text-slate-400 text-center">*Admin: Create accounts in Supabase Dashboard.</p>
    </form>
  );
}