/**
 * VYRO — Theme entry point.
 *
 * Every screen and component should import theme tokens from here, not
 * hardcode values. That's the whole reason this file exists.
 *
 *   import { colors, typography, spacing, radius } from '@/src/theme';
 */

export { colors } from './colors';
export type { ColorToken } from './colors';

export { typography, fontFamily } from './typography';
export type { TypographyVariant } from './typography';

export { spacing, radius, borderWidth, thread } from './spacing';
export type { Spacing, Radius } from './spacing';

export { fontAssets } from './fonts';
