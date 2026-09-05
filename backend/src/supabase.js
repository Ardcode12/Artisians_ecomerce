const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mxybufiafsgpdcgmltjv.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_32Rt4zcd2BMF9JfwDON4Wg_XoDvf6hx';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

const clientOptions = {
  auth: {
    persistSession: false,
  },
  realtime: {
    transport: WebSocket,
  },
};

// Client with public/anon key (respects RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey, clientOptions);

// Admin client with service role key (bypasses RLS for secure server actions)
const supabaseAdmin = (supabaseServiceRoleKey && supabaseServiceRoleKey !== supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, clientOptions)
  : supabase;

module.exports = {
  supabase,
  supabaseAdmin,
  supabaseUrl,
};
