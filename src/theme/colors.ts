/**
 * CoupleGoAI — Color Tokens
 * Extracted from the website's pink/lavender brand identity.
 * All palette values are static; semantic aliases map palette → intent.
 */

// ─── Palette ─────────────────────────────────────────────────────────────────
export const palette = {
  // Pinks
  pink50:  '#FFF0F6',
  pink100: '#FFD6E7',
  pink200: '#FFAACB',
  pink300: '#FF7BAD',
  pink400: '#F74E8E',
  pink500: '#E8327A',  // primary brand pink
  pink600: '#C4215E',

  // Lavender / Purple
  lavender50:  '#FAF5FF',
  lavender100: '#F3E8FF',
  lavender200: '#E9D5FF',
  lavender300: '#D8B4FE',
  lavender400: '#C084FC',
  lavender500: '#A855F7',  // accent purple
  lavender600: '#9333EA',
  lavender700: '#7C3AED',

  // Deep purple (text, footer)
  purple900: '#1E0A3C',
  purple800: '#2D1155',
  purple700: '#3B1A7A',

  // Neutrals
  white:    '#FFFFFF',
  gray50:   '#FAFAFA',
  gray100:  '#F4F4F5',
  gray200:  '#E4E4E7',
  gray300:  '#D4D4D8',
  gray400:  '#A1A1AA',
  gray500:  '#71717A',
  gray600:  '#52525B',
  gray700:  '#3F3F46',
  gray800:  '#27272A',
  gray900:  '#18181B',
  black:    '#09090B',

  // Functional
  success: '#22C55E',
  warning: '#F59E0B',
  error:   '#EF4444',
  info:    '#3B82F6',

  // Transparent
  transparent: 'transparent',
} as const;

// ─── Gradient Definitions ────────────────────────────────────────────────────
export const gradients = {
  // Primary brand gradient (pink → lavender)
  brand:    [palette.pink500, palette.lavender500] as string[],
  brandSoft:[palette.pink300, palette.lavender400] as string[],
  // Hero background wash
  heroWash: [palette.lavender50, palette.pink50, '#FFFFFF'] as string[],
  // Card backgrounds
  cardWarm: [palette.pink50, palette.lavender50] as string[],
  // CTA panel gradient
  ctaPanel: [palette.pink500, palette.lavender600] as string[],
  // Dark overlay for images
  darkOverlay: ['rgba(30,10,60,0)', 'rgba(30,10,60,0.7)'] as string[],
} as const;

// ─── Semantic Tokens ─────────────────────────────────────────────────────────
export const light = {
  // Backgrounds
  bgPrimary:   palette.lavender50,
  bgSecondary: palette.white,
  bgCard:      palette.white,
  bgMuted:     palette.gray100,
  bgOverlay:   'rgba(250,245,255,0.85)',

  // Text
  textPrimary:   palette.purple900,
  textSecondary: palette.gray600,
  textMuted:     palette.gray400,
  textInverse:   palette.white,
  textAccent:    palette.pink500,

  // Brand
  brandPrimary:  palette.pink500,
  brandSecondary:palette.lavender500,
  brandLight:    palette.pink100,

  // Borders
  borderLight:   palette.gray200,
  borderMedium:  palette.gray300,
  borderFocus:   palette.pink400,

  // Interactive
  primaryBtn:    palette.pink500,
  primaryBtnText:palette.white,
  secondaryBtn:  palette.lavender100,
  secondaryBtnText: palette.lavender700,

  // Status
  online:  palette.success,
  offline: palette.gray400,
  streak:  palette.warning,
} as const;

export const dark = {
  bgPrimary:    palette.purple900,
  bgSecondary:  palette.purple800,
  bgCard:       palette.purple800,
  bgMuted:      palette.purple700,
  bgOverlay:    'rgba(30,10,60,0.9)',

  textPrimary:   palette.white,
  textSecondary: palette.lavender200,
  textMuted:     palette.lavender300,
  textInverse:   palette.purple900,
  textAccent:    palette.pink300,

  brandPrimary:  palette.pink400,
  brandSecondary:palette.lavender400,
  brandLight:    palette.purple700,

  borderLight:   palette.purple700,
  borderMedium:  palette.lavender700,
  borderFocus:   palette.pink400,

  primaryBtn:    palette.pink500,
  primaryBtnText:palette.white,
  secondaryBtn:  palette.purple700,
  secondaryBtnText: palette.lavender200,

  online:  palette.success,
  offline: palette.gray600,
  streak:  palette.warning,
} as const;

export type ColorTheme = typeof light;
