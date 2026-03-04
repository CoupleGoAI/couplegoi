import { Platform } from 'react-native';
import { typographyTokens } from './tokens';

/**
 * CoupleGoAI — Typography Tokens
 * Mirrors the editorial serif / clean sans system from the website.
 *
 * IMPORTANT: Font size, weight, lineHeight, and letterSpacing primitives
 * are canonical in `tokens.ts`. This file re-exports them and builds
 * composed text styles. Do NOT add ad-hoc font sizes in components.
 */

// ─── Font Families ────────────────────────────────────────────────────────────
export const fontFamilies = {
  // Display / editorial serif (Google Fonts: Playfair Display via expo-google-fonts)
  // Fallback to system serif until loaded
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia',
  }),
  serifBold: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia',
  }),
  // Clean sans-serif for body / UI
  sans: Platform.select({
    ios: '-apple-system',
    android: 'Roboto',
    default: 'System',
  }),
  sansBold: Platform.select({
    ios: '-apple-system',
    android: 'Roboto',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Courier',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

// ─── Font Sizes (from tokens.ts + extras) ────────────────────────────────────
export const fontSize = {
  ...typographyTokens.fontSize,
  '6xl': 52,
} as const;

// ─── Line Heights (from tokens.ts) ───────────────────────────────────────────
export const lineHeight = typographyTokens.lineHeight;

// ─── Font Weights (from tokens.ts + extras) ──────────────────────────────────
export const fontWeight = {
  ...typographyTokens.fontWeight,
  extrabold: '800' as const,
} as const;

// ─── Letter Spacing (from tokens.ts) ─────────────────────────────────────────
export const letterSpacing = typographyTokens.letterSpacing;

// ─── Composed Text Styles ─────────────────────────────────────────────────────
export const textStyles = {
  // Display (hero headlines)
  displayLg: {
    fontFamily: fontFamilies.serifBold,
    fontSize: fontSize['5xl'],
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['5xl'] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  displayMd: {
    fontFamily: fontFamilies.serifBold,
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['4xl'] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  displaySm: {
    fontFamily: fontFamilies.serifBold,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['3xl'] * lineHeight.snug,
    letterSpacing: letterSpacing.tight,
  },
  // Headlines (section titles)
  h1: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['2xl'] * lineHeight.snug,
  },
  h2: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.xl * lineHeight.snug,
  },
  h3: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.lg * lineHeight.normal,
  },
  // Body
  bodyLg: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.md * lineHeight.relaxed,
  },
  bodyMd: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  bodySm: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.sm * lineHeight.normal,
  },
  // Label / microcopy
  labelMd: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  labelSm: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase' as const,
  },
  // Caption
  caption: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.xs * lineHeight.normal,
  },
  // Button
  btnLg: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  btnMd: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  btnSm: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
} as const;
