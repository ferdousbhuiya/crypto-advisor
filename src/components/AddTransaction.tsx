// src/components/AddTransaction.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function AddTransaction() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    asset_symbol: '',
    platform: '',
    transaction_type: 'BUY' as 'BUY' | 'SELL' | 'TRANSFER_IN' | 'TRANSFER_OUT',
    quantity: '',
    price_per_unit: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Not authenticated');
        return;
      }

      const quantity = parseFloat(formData.quantity);
      const price_per_unit = parseFloat(formData.price_per_unit);
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

      alert('Transaction added successfully!');
      setShowForm(false);
      setFormData({
        asset_symbol: '',
        platform: '',
        transaction_type: 'BUY',
        quantity: '',
        price_per_unit: '',
        transaction_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      
      window.location.reload();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Error adding transaction. Please try again.');
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
          <div>
            <label className="block text-sm text-slate-400 mb-1">Asset Symbol (e.g., BTC, ETH)</label>
            <input
              type="text"
              value={formData.asset_symbol}
              onChange={(e) => setFormData({ ...formData, asset_symbol: e.target.value })}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white"
              placeholder="BTC"
              required
            />
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