function requireEnv(key: string): string {
    const value = process.env[key]?.trim();
    if (!value) {
        throw new Error(
            `Missing required public env var ${key}. Set it in .env.local or the shell before starting Expo.`,
        );
    }
    return value;
}

export const runtimeConfig = {
    supabaseUrl: requireEnv('EXPO_PUBLIC_SUPABASE_URL'),
    supabasePublishableDefaultKey: requireEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'),
    supabaseAnonKey: requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
};
