import { Platform } from 'react-native';

/**
 * CoupleGoAI — Typography Tokens
 * Mirrors the editorial serif / clean sans system from the website.
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

// ─── Font Sizes ───────────────────────────────────────────────────────────────
export const fontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   19,
  xl:   22,
  '2xl':26,
  '3xl':30,
  '4xl':36,
  '5xl':44,
  '6xl':52,
} as const;

// ─── Line Heights ─────────────────────────────────────────────────────────────
export const lineHeight = {
  tight:  1.15,
  snug:   1.3,
  normal: 1.5,
  relaxed:1.7,
} as const;

// ─── Font Weights ─────────────────────────────────────────────────────────────
export const fontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
  extrabold:'800' as const,
} as const;

// ─── Letter Spacing ───────────────────────────────────────────────────────────
export const letterSpacing = {
  tight:  -0.5,
  normal:  0,
  wide:    0.5,
  wider:   1,
  widest:  2,
} as const;

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
