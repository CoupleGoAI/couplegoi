/**
 * CoupleGoAI — Design Tokens (Single Source of Truth)
 *
 * Every color, radius, spacing, shadow, and typography primitive lives here.
 * Other theme files (`colors.ts`, `spacing.ts`, `typography.ts`) must
 * re-export or derive from these tokens — never define raw values themselves.
 *
 * NativeWind / `tailwind.config.js` maps these tokens to semantic class names.
 * Components must use `className` with those names, never raw hex or numbers.
 *
 * STRICT RULES:
 * - No hardcoded hex colors in components.
 * - No arbitrary spacing numbers or inline border-radius values.
 * - Prefer NativeWind `className` using semantic tokens.
 * - Use StyleSheet only for truly dynamic or unsupported styles.
 * - If a new token is needed, add it HERE first, then map in tailwind.config.js.
 */

// ─── Colors ──────────────────────────────────────────────────────────────────
export const colors = {
  /** App background */
  background: '#ffffff',
  /** Primary text / headings */
  foreground: '#1e1230',
  /** Secondary / muted text */
  foregroundMuted: '#42335a',
  /** Tertiary text, placeholders, icons */
  gray: '#8a7b9e',
  /** Brand pink — CTAs, links, accents */
  primary: '#f48ba6',
  /** Lighter brand pink — hover states, soft highlights */
  primaryLight: '#f9b5c8',
  /** Brand lavender — secondary accents */
  accent: '#cc7be8',
  /** Lighter lavender */
  accentLight: '#dda8f0',
  /** Soft pink surface — cards, badges, subtle backgrounds */
  muted: '#fef0f4',
  /** Soft lavender surface */
  accentSoft: '#f5eafa',
  /** Borders — soft neutral derived from foreground */
  borderDefault: 'rgba(30, 18, 48, 0.12)',
  /** Optional elevated surface tint */
  surface: 'rgba(244, 139, 166, 0.06)',

  // ── Functional ──
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // ── Utility ──
  transparent: 'transparent',
  white: '#ffffff',
  black: '#09090b',
} as const;

// ─── Gradients ───────────────────────────────────────────────────────────────
export const gradients = {
  /** Primary brand gradient (pink → lavender) */
  brand: [colors.primary, colors.accent] as readonly [string, string],
  /** Softer brand gradient */
  brandSoft: [colors.primaryLight, colors.accentLight] as readonly [string, string],
} as const;

// ─── Radii ───────────────────────────────────────────────────────────────────
export const radii = {
  /** Standard card / surface radius */
  radius: 20,
  /** Smaller elements — inputs, badges, chips */
  radiusSm: 12,
  /** Pill / fully rounded */
  radiusFull: 999,
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const spacing = {
  /** 4px — micro gaps, icon offsets */
  xs: 4,
  /** 8px — tight inner padding */
  sm: 8,
  /** 12px — default inner gap */
  md: 12,
  /** 16px — standard padding */
  lg: 16,
  /** 24px — section gaps, generous padding */
  xl: 24,
  /** 32px — large section separators */
  '2xl': 32,
} as const;

// ─── Shadows (React Native style objects) ────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  glowPrimary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glowAccent: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ─── Typography primitives ───────────────────────────────────────────────────
export const typographyTokens = {
  /** Semantic font size scale */
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 19,
    xl: 22,
    '2xl': 26,
    '3xl': 30,
    '4xl': 36,
    '5xl': 44,
  },
  lineHeight: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.7,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const;

// ─── Aggregated export ───────────────────────────────────────────────────────
export const tokens = {
  colors,
  gradients,
  radii,
  spacing,
  shadows,
  typography: typographyTokens,
} as const;

export type Tokens = typeof tokens;
