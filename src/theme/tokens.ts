/**
 * CoupleGoAI — Design Tokens (Single Source of Truth)
 *
 * This is the ONLY theme file. Every color, radius, spacing, shadow,
 * font family, typography primitive, composed text style, layout constant,
 * and gradient lives here.
 *
 * Components must import styling values exclusively from this file.
 *
 * STRICT RULES:
 * - No hardcoded hex colors in components.
 * - No arbitrary spacing numbers or inline border-radius values.
 * - Prefer NativeWind `className` using semantic tokens.
 * - Use StyleSheet only for truly dynamic or unsupported styles.
 * - If a new token is needed, add it HERE first, then map in tailwind.config.js.
 */

import { Platform } from 'react-native';

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
    /** Light border variant */
    borderLight: 'rgba(228, 228, 231, 0.4)',
    /** Optional elevated surface tint */
    surface: 'rgba(244, 139, 166, 0.06)',

    // ── Functional ──
    success: '#22c55e',
    successBg: '#dcfce7',
    successText: '#166534',
    warning: '#f59e0b',
    warningBg: '#fef9c3',
    warningText: '#854d0e',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.08)',
    info: '#3b82f6',
    infoBg: '#dbeafe',
    infoText: '#1e40af',

    // ── Utility ──
    transparent: 'transparent',
    white: '#ffffff',
    black: '#09090b',
} as const;

// ─── Gradients ───────────────────────────────────────────────────────────────
export const gradients = {
    /** Primary brand gradient (pink → lavender) */
    brand: [colors.primary, colors.accent] as [string, string],
    /** Softer brand gradient */
    brandSoft: [colors.primaryLight, colors.accentLight] as [string, string],
    /** Disabled state gradient */
    disabled: [colors.gray, colors.foregroundMuted] as [string, string],
    /** Hero / wash background: accentSoft → muted → background */
    heroWash: [colors.accentSoft, colors.muted, colors.background] as [string, string, string],
};

// ─── Radii ───────────────────────────────────────────────────────────────────
export const radii = {
    /** Standard card / surface radius */
    radius: 20,
    /** Medium elements — inputs, panels */
    radiusMd: 16,
    /** Smaller elements — badges, chips, error banners */
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

// ─── Layout Constants ────────────────────────────────────────────────────────
export const layout = {
    /** 20px — horizontal screen padding */
    screenPaddingH: 20,
    /** 24px — vertical screen padding */
    screenPaddingV: 24,
    /** 20px — default card inner padding */
    cardPadding: 20,
    /** 40px — between major sections */
    sectionGap: 40,
    /** 16px — between list items */
    itemGap: 16,
    /** 56px — standard header height */
    headerHeight: 56,
    /** 48px — WCAG minimum tap target */
    minTapTarget: 48,
} as const;

// ─── Shadows (React Native style objects) ────────────────────────────────────
export const shadows = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
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

// ─── Font Families ───────────────────────────────────────────────────────────
export const fontFamilies = {
    serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    serifBold: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    sans: Platform.select({ ios: '-apple-system', android: 'Roboto', default: 'System' }),
    sansBold: Platform.select({ ios: '-apple-system', android: 'Roboto', default: 'System' }),
    mono: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
} as const;

// ─── Typography Primitives ───────────────────────────────────────────────────
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
        subtle: 0.3,
        wide: 0.5,
        wider: 1,
        widest: 2,
    },
} as const;

// ─── Convenience re-exports from typography primitives ───────────────────────
export const fontSize = typographyTokens.fontSize;
export const fontWeight = typographyTokens.fontWeight;
export const lineHeight = typographyTokens.lineHeight;
export const letterSpacing = typographyTokens.letterSpacing;

// ─── Composed Text Styles ────────────────────────────────────────────────────
export const textStyles = {
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
    caption: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.regular,
        lineHeight: fontSize.xs * lineHeight.normal,
    },
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

// ─── Aggregated export ───────────────────────────────────────────────────────
export const tokens = {
    colors,
    gradients,
    radii,
    spacing,
    layout,
    shadows,
    fontFamilies,
    typography: typographyTokens,
    textStyles,
} as const;

export type Tokens = typeof tokens;
