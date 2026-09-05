import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Polyfill WebSocket for SSR/Node environment if missing
if (typeof globalThis !== 'undefined' && !(globalThis as any).WebSocket) {
  try {
    (globalThis as any).WebSocket = require('ws');
  } catch (e) {}
}

// Supabase Project URL
export const SUPABASE_URL = 'https://mxybufiafsgpdcgmltjv.supabase.co';

// Publishable / Anon Key
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_32Rt4zcd2BMF9JfwDON4Wg_XoDvf6hx';

// Bulletproof storage adapter for Expo Go and Web (no native module crashes)
class SafeStorageAdapter {
  private memoryStore = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        // Fallback to memory if cookies/storage blocked
      }
    }
    return this.memoryStore.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {}
    }
    this.memoryStore.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {}
    }
    this.memoryStore.delete(key);
  }
}

const customStorage = new SafeStorageAdapter();

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface ArtisanProfile {
  id: string;
  phone: string;
  name: string;
  shop_name?: string;
  role: 'artisan' | 'buyer';
  craft_type?: string;
  craft_custom?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  language?: string;
  scheme_id?: string;
  is_onboarded?: boolean;
  bank_account_no?: string;
  bank_ifsc?: string;
  bank_holder_name?: string;
  bank_name?: string;
  upi_id?: string;
  created_at?: string;
  updated_at?: string;
}
