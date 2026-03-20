import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Isolated Supabase client for the admin panel.
// Uses a different storageKey so admin auth never interferes with
// the main app's user session (and vice versa).
export const adminSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storageKey: 'kitchen-admin-sb-auth',
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
