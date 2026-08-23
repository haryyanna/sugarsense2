import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigError = !isSupabaseConfigured
  ? 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env.'
  : null;

if (!isSupabaseConfigured) {
  console.warn('Supabase config missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Application will run in local-only mode.');
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
