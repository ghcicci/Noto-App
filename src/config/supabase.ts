// ../config/supabase.ts (CORRECTED)

import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store'; // 🔑 Import the secure storage
import { createClient } from '@supabase/supabase-js';

// ✅ Supabase Project Credentials
const SUPABASE_URL = 'https://ytzkmykhoeoyfsjxxldl.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0emtteWtob2VveWZzanh4bGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjk3NzQsImV4cCI6MjA3NDkwNTc3NH0.OQzo405XvyUwyD8bmM787Z_KiABzHVenv1I8n9ANLIA';

// Define the custom storage adapter using expo-secure-store
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// ✅ Create and export Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // 👇 Use the SecureStore adapter
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});