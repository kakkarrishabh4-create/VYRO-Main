/**
 * VYRO — Spacing (8pt grid) and radius tokens
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8, // component default — buttons, cards, inputs
  lg: 12,
  pill: 999, // do not use for buttons; reserved for badges/avatars only
} as const;

export const borderWidth = {
  hairline: 1,
} as const;

// Signature thread (vertical journal line)
export const thread = {
  width: 1,
  leftInset: 24,
  dotSize: 6,
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
