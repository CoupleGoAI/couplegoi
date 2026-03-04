/**
 * CoupleGoAI — Tailwind / NativeWind Configuration
 *
 * Extends the default theme with semantic design tokens from src/theme/tokens.ts.
 * Components use these class names (e.g. bg-background, text-foreground, rounded-xl)
 * instead of raw hex values.
 *
 * Keep this file in sync with tokens.ts — it is the bridge between
 * the design system and NativeWind className usage.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './App.{js,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#1e1230',
        foregroundMuted: '#42335a',
        gray: '#8a7b9e',
        primary: '#f48ba6',
        primaryLight: '#f9b5c8',
        accent: '#cc7be8',
        accentLight: '#dda8f0',
        muted: '#fef0f4',
        accentSoft: '#f5eafa',
        borderDefault: 'rgba(30, 18, 48, 0.12)',
        surface: 'rgba(244, 139, 166, 0.06)',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      borderRadius: {
        sm: '12px',  // radiusSm
        md: '20px',  // radius (default card/surface)
        xl: '20px',  // alias for radius
        full: '999px', // radiusFull — pill shape
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
      },
      boxShadow: {
        sm: '0 1px 4px rgba(30, 18, 48, 0.06)',
        md: '0 4px 12px rgba(30, 18, 48, 0.10)',
        lg: '0 8px 24px rgba(30, 18, 48, 0.14)',
        'glow-primary': '0 4px 16px rgba(244, 139, 166, 0.35)',
        'glow-accent': '0 4px 16px rgba(204, 123, 232, 0.30)',
      },
      fontSize: {
        xs: ['11px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['15px', { lineHeight: '22px' }],
        md: ['17px', { lineHeight: '26px' }],
        lg: ['19px', { lineHeight: '28px' }],
        xl: ['22px', { lineHeight: '30px' }],
        '2xl': ['26px', { lineHeight: '34px' }],
        '3xl': ['30px', { lineHeight: '40px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
        '5xl': ['44px', { lineHeight: '52px' }],
      },
    },
  },
  plugins: [],
};
