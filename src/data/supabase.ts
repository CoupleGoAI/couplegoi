import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const PUBLISHABLE_DEFAULT_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? '';

/**
 * Custom storage adapter for Supabase using expo-secure-store.
 * Supabase JS calls getItem/setItem/removeItem for session persistence.
 * All tokens stay in the secure enclave — never AsyncStorage.
 */
const ExpoSecureStoreAdapter = {
    getItem: (key: string): Promise<string | null> =>
        SecureStore.getItemAsync(key),
    setItem: (key: string, value: string): Promise<void> =>
        SecureStore.setItemAsync(key, value),
    removeItem: (key: string): Promise<void> =>
        SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, PUBLISHABLE_DEFAULT_KEY, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
