import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Fill these in with your Supabase project's public values
// (Project Settings > API). The anon key is safe to ship in the app —
// Row Level Security on the tables is what actually protects data.
const SUPABASE_URL = 'https://zplnwjjrnuzjbmunipdt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i5sYbPRW5a4cXQT1BOtdjw_zrydRV1q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
