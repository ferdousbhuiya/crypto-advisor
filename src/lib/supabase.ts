// src/lib/supabase.ts
console.log("SUPABASE FILE LOADED");

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TypeScript Interfaces for our Database
export interface Transaction {
  id: string;
  user_id: string;
  asset_symbol: string;
  transaction_type: 'BUY' | 'SELL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  quantity: string; // Supabase returns NUMERIC as strings in JS to prevent precision loss
  price_per_unit: string;
  fiat_value: string;
  transaction_date: string;
  notes: string | null;
  created_at: string;
  platform: string | null;
}
console.log("Loaded supabase.ts");

export interface Alert {
  id: string;
  user_id: string;
  asset_symbol: string;
  condition_type: 'PRICE_ABOVE' | 'PRICE_BELOW';
  target_price: string;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'member';
  created_at: string;
}