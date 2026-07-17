import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Uses AsyncStorage by default in React Native if provided, but since we haven't installed it yet, 
    // we'll rely on the default in-memory for the skeleton, or we can add AsyncStorage.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
