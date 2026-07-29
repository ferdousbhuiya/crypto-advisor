// src/components/AddTransaction.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function AddTransaction() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [symbolSuggestions, setSymbolSuggestions] = useState<{ id: string; name: string; symbol: string; thumb: string }[]>([]);
  const [symbolQuery, setSymbolQuery] = useState('');
  const pickedRef = useRef(false);

  const [formData, setFormData] = useState({
    asset_symbol: '',
    platform: '',
    transaction_type: 'BUY' as 'BUY' | 'SELL' | 'TRANSFER_IN' | 'TRANSFER_OUT',
    quantity: '',
    price_per_unit: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Search coin suggestions
  useEffect(() => {
    if (!symbolQuery.trim() || pickedRef.current) {
      setSymbolSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const headers: Record<string, string> = {};
        const key = import.meta.env.VITE_COINGECKO_API_KEY || '';
        if (key) headers['x-cg-demo-api-key'] = key;
        const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbolQuery)}`, { headers });
        const d = await r.json();
        setSymbolSuggestions((d.coins || []).slice(0, 8));
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [symbolQuery]);

  function pickSymbol(s: { symbol: string; name: string }) {
    pickedRef.current = true;
    setFormData(f => ({ ...f, asset_symbol: s.symbol.toUpperCase() }));
    setSymbolQuery(s.symbol.toUpperCase());
    setSymbolSuggestions([]);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Not authenticated'); return; }

      const quantity = parseFloat(formData.quantity);
      const price_per_unit = Math.abs(parseFloat(formData.price_per_unit));
      const fiat_value = quantity * price_per_unit;

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        asset_symbol: formData.asset_symbol.toUpperCase(),
        platform: formData.platform,
        transaction_type: formData.transaction_type,
        quantity: quantity.toString(),
        price_per_unit: price_per_unit.toString(),
        fiat_value: fiat_value.toString(),
        transaction_date: formData.transaction_date,
        notes: formData.notes || null,
      });

      if (error) throw error;

      setShowForm(false);
      setTimeout(() => window.location.reload(), 300);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
      >
        + Add New Investment
      </button>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Add Investment Transaction</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm text-slate-400 mb-1">Asset Symbol (e.g., BTC, ETH)</label>
            <input
              type="text"
              value={formData.asset_symbol}
              onChange={(e) => { pickedRef.current = false; setSymbolQuery(e.target.value); setFormData(f => ({ ...f, asset_symbol: e.target.value })) }}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white"
              placeholder="Type to search…"
              required
              autoComplete="off"
            />
            {symbolSuggestions.length > 0 && !pickedRef.current && (
              <ul className="absolute z-20 bg-slate-800 border border-slate-700 rounded mt-1 w-full max-h-48 overflow-y-auto shadow-xl">
                {symbolSuggestions.map(s => (
                  <li key={s.id} onClick={() => pickSymbol(s)} className="px-2 py-1.5 text-sm hover:bg-slate-700 cursor-pointer flex items-center gap-2">
                    <img src={s.thumb} alt="" className="w-4 h-4" />
                    {s.name} <span className="text-slate-500">{s.symbol.toUpperCase()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Platform (e.g., Coinbase, Binance)</label>
            <input
              type="text"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white"
              placeholder="Coinbase"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Transaction Type</label>
            <select
              value={formData.transaction_type}
              onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as any })}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
              <option value="TRANSFER_IN">TRANSFER IN</option>
              <option value="TRANSFER_OUT">TRANSFER OUT</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Quantity</label>
            <input
              type="number"
              step="any"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white"
              placeholder="0.5"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Price per Unit (USD)</label>
            <input
              type="number"
              step="any"
              value={formData.price_per_unit}
              onChange={(e) => setFormData({ ...formData, price_per_unit: e.target.value })}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white"
              placeholder="45000"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white"
            rows={2}
            placeholder="DCA purchase, etc."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Saving...' : 'Save Transaction'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}