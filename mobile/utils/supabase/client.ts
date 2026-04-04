import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// SecureStore n'accepte pas les clés avec des caractères spéciaux
const secureStoreAdapter = {
  getItem: (key: string) =>
    SecureStore.getItemAsync(key.replace(/[^a-zA-Z0-9._-]/g, '_')),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(key.replace(/[^a-zA-Z0-9._-]/g, '_'), value),
  removeItem: (key: string) =>
    SecureStore.deleteItemAsync(key.replace(/[^a-zA-Z0-9._-]/g, '_')),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
