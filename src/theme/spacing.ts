/**
 * CoupleGoAI — Spacing & Layout Tokens
 * Base unit: 4px. All values are multiples of 4.
 *
 * IMPORTANT: Canonical semantic spacing/radii/shadows live in `tokens.ts`.
 * This file preserves the full numeric spacing scale and layout constants
 * for backward compatibility. New code should prefer tokens.ts semantic
 * names (xs/sm/md/lg/xl) or NativeWind className.
 */
import {
  radii as tokenRadii,
  shadows as tokenShadows,
  spacing as tokenSpacing,
} from './tokens';

export const spacing = {
  // Micro
  '0.5': 2,
  '1':   4,
  '1.5': 6,
  '2':   8,
  '3':  12,
  '4':  16,
  '5':  20,
  '6':  24,
  '7':  28,
  '8':  32,
  '10': 40,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '32': 128,
} as const;

export const radii = {
  none:  0,
  sm:    4,
  md:    8,
  lg:    tokenRadii.radiusSm,   // 12
  xl:    16,
  '2xl': tokenRadii.radius,     // 20
  '3xl': 24,
  full:  tokenRadii.radiusFull, // 999
} as const;

/**
 * Semantic radii — forwarded from tokens.ts.
 * Prefer these in new code, or use NativeWind `rounded-sm/md/xl/full`.
 */
export const semanticRadii = tokenRadii;

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: tokenShadows.sm,
  md: tokenShadows.md,
  lg: tokenShadows.lg,
  brand: tokenShadows.glowPrimary,
} as const;

/**
 * Semantic spacing — forwarded from tokens.ts.
 * Prefer these in new code, or use NativeWind spacing utilities.
 */
export const semanticSpacing = tokenSpacing;

export const layout = {
  screenPaddingH: spacing['5'],   // 20px horizontal screen padding
  screenPaddingV: spacing['6'],   // 24px vertical screen padding
  cardPadding:    spacing['5'],   // 20px inside cards
  sectionGap:     spacing['10'],  // 40px between sections
  itemGap:        spacing['4'],   // 16px between list items
  tabBarHeight:   64,
  headerHeight:   56,
  minTapTarget:   48,             // WCAG minimum tap target
} as const;
