import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { runtimeConfig } from '@/config/runtimeConfig';

const SUPABASE_URL = runtimeConfig.supabaseUrl;
const PUBLISHABLE_DEFAULT_KEY = runtimeConfig.supabasePublishableDefaultKey;

const SECURE_STORE_CHUNK_SIZE = 2000;
const CHUNK_META_SUFFIX = '_meta';
const CHUNK_PART_PREFIX = '_chunk_';
const webMemoryStorage = new Map<string, string>();

/**
 * Sanitise a key so it only contains characters allowed by expo-secure-store:
 * alphanumeric, ".", "-", and "_".
 */
function sanitizeKey(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function chunkKey(key: string, index: number): string {
    return `${key}${CHUNK_PART_PREFIX}${index}`;
}

async function removeChunkedValue(key: string): Promise<void> {
    const metaKey = `${key}${CHUNK_META_SUFFIX}`;
    const metaJson = await SecureStore.getItemAsync(metaKey);
    if (!metaJson) return;

    await SecureStore.deleteItemAsync(metaKey);

    try {
        const meta = JSON.parse(metaJson) as { chunks?: number };
        const count = typeof meta.chunks === 'number' ? meta.chunks : 0;
        if (count <= 0) return;

        await Promise.all(
            Array.from({ length: count }, (_, index) =>
                SecureStore.deleteItemAsync(chunkKey(key, index)),
            ),
        );
    } catch {
        // Ignore corrupt metadata; best-effort cleanup only.
    }
}

function getBrowserStorage(): Storage | null {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

const WebStorageAdapter = {
    getItem: async (rawKey: string): Promise<string | null> => {
        const key = sanitizeKey(rawKey);
        const browserStorage = getBrowserStorage();

        if (browserStorage) {
            return browserStorage.getItem(key);
        }

        return webMemoryStorage.get(key) ?? null;
    },
    setItem: async (rawKey: string, value: string): Promise<void> => {
        const key = sanitizeKey(rawKey);
        const browserStorage = getBrowserStorage();

        if (browserStorage) {
            browserStorage.setItem(key, value);
            return;
        }

        webMemoryStorage.set(key, value);
    },
    removeItem: async (rawKey: string): Promise<void> => {
        const key = sanitizeKey(rawKey);
        const browserStorage = getBrowserStorage();

        if (browserStorage) {
            browserStorage.removeItem(key);
            return;
        }

        webMemoryStorage.delete(key);
    },
};

/**
 * Custom storage adapter for Supabase using expo-secure-store.
 * Supabase JS calls getItem/setItem/removeItem for session persistence.
 * All tokens stay in the secure enclave — never AsyncStorage.
 */
const ExpoSecureStoreAdapter = {
    getItem: async (rawKey: string): Promise<string | null> => {
        const key = sanitizeKey(rawKey);
        const metaKey = `${key}${CHUNK_META_SUFFIX}`;
        const metaJson = await SecureStore.getItemAsync(metaKey);
        if (!metaJson) return SecureStore.getItemAsync(key);

        try {
            const meta = JSON.parse(metaJson) as { chunks?: number };
            const count = typeof meta.chunks === 'number' ? meta.chunks : 0;
            if (count <= 0) return SecureStore.getItemAsync(key);

            const parts = await Promise.all(
                Array.from({ length: count }, (_, index) =>
                    SecureStore.getItemAsync(chunkKey(key, index)),
                ),
            );

            if (parts.some((part) => part === null)) return null;
            return parts.join('');
        } catch {
            return SecureStore.getItemAsync(key);
        }
    },
    setItem: async (rawKey: string, value: string): Promise<void> => {
        const key = sanitizeKey(rawKey);
        if (value.length <= SECURE_STORE_CHUNK_SIZE) {
            await removeChunkedValue(key);
            await SecureStore.setItemAsync(key, value);
            return;
        }

        await removeChunkedValue(key);
        await SecureStore.deleteItemAsync(key);

        const chunks = Math.ceil(value.length / SECURE_STORE_CHUNK_SIZE);
        const metaKey = `${key}${CHUNK_META_SUFFIX}`;
        await SecureStore.setItemAsync(metaKey, JSON.stringify({ chunks }));

        await Promise.all(
            Array.from({ length: chunks }, (_, index) =>
                SecureStore.setItemAsync(
                    chunkKey(key, index),
                    value.slice(index * SECURE_STORE_CHUNK_SIZE, (index + 1) * SECURE_STORE_CHUNK_SIZE),
                ),
            ),
        );
    },
    removeItem: async (rawKey: string): Promise<void> => {
        const key = sanitizeKey(rawKey);
        await SecureStore.deleteItemAsync(key);
        await removeChunkedValue(key);
    },
};

const storageAdapter = Platform.OS === 'web' ? WebStorageAdapter : ExpoSecureStoreAdapter;

export const supabase = createClient(SUPABASE_URL, PUBLISHABLE_DEFAULT_KEY, {
    auth: {
        storage: storageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
