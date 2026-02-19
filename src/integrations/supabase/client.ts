import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables');
}

const clientOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};

// In dev mode, Vite HMR re-evaluates this module on every reload, which creates
// multiple Supabase client instances all fighting over the same refresh token.
// Preserve the client on the window object so HMR reloads reuse the same instance.
declare global {
  interface Window { __supabaseClient?: SupabaseClient; }
}

export const supabase: SupabaseClient =
  import.meta.env.DEV
    ? (window.__supabaseClient ??= createClient(supabaseUrl, supabaseAnonKey, clientOptions))
    : createClient(supabaseUrl, supabaseAnonKey, clientOptions);