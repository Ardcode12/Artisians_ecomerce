/**
 * supabase.ts — Local backend stub
 *
 * This project uses a local FastAPI backend (not Supabase).
 * This file is a no-op shim kept for import compatibility
 * with any components that reference @/services/supabase.
 *
 * Auth is handled by AuthContext.tsx via the local backend.
 */

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

// No-op supabase stub — all auth goes through local backend
export const supabase = null as any;
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
