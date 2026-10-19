import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedSupabase: SupabaseClient | null = null;

export const getSupabase = () => {
  if (cachedSupabase) return cachedSupabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  cachedSupabase = createClient(supabaseUrl, supabaseKey);
  return cachedSupabase;
};

// Proxy export to maintain existing imports across your project without breaking changes
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabase();
    return (client as any)[prop];
  },
});