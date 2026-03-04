/**
 * CoupleGoAI — Design System Entry
 * Single import point for all design tokens.
 */
import { light, dark, gradients, palette, type ColorTheme } from './colors';
import { fontFamilies, fontSize, fontWeight, lineHeight, letterSpacing, textStyles } from './typography';
import { spacing, radii, shadows, layout } from './spacing';

export const theme = {
  colors: {
    light,
    dark,
    gradients,
    palette,
  },
  typography: {
    fontFamilies,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
    textStyles,
  },
  spacing,
  radii,
  shadows,
  layout,
} as const;

export type Theme = typeof theme;
export type { ColorTheme };

// Re-export for convenience
export { light, dark, gradients, palette };
export { fontFamilies, fontSize, fontWeight, lineHeight, letterSpacing, textStyles };
export { spacing, radii, shadows, layout };
