/**
 * CoupleGoAI — API Configuration
 *
 * EXPO_PUBLIC_API_BASE_URL is set at build time via .env or EAS secrets.
 * Falls back to the production endpoint when not explicitly overridden.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.couplegoai.com/v1';
