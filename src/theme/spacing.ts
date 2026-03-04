/**
 * CoupleGoAI — Spacing & Layout Tokens
 * Base unit: 4px. All values are multiples of 4.
 */

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
  lg:    12,
  xl:    16,
  '2xl': 20,
  '3xl': 24,
  full:  9999,  // pill-shaped
} as const;

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#1E0A3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1E0A3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#1E0A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  brand: {
    shadowColor: '#E8327A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

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
