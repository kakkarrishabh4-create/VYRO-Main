/**
 * VYRO — Typography tokens
 *
 * Three families, no exceptions:
 *  • Fraunces      → headings only (large, warm, characterful)
 *  • Inter         → body, buttons, all UI labels
 *  • IBM Plex Mono → all numeric data so columns of weights/reps/macros align
 */

import { TextStyle } from 'react-native';

export const fontFamily = {
  headingRegular: 'Fraunces-Regular',
  headingItalic: 'Fraunces-Italic',

  bodyRegular: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',

  numericRegular: 'IBMPlexMono-Regular',
  numericMedium: 'IBMPlexMono-Medium',
  numericSemiBold: 'IBMPlexMono-SemiBold',
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.headingRegular,
    fontWeight: '600',
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
  } as TextStyle,

  h1: {
    fontFamily: fontFamily.headingRegular,
    fontWeight: '600',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
  } as TextStyle,

  h2: {
    fontFamily: fontFamily.headingRegular,
    fontWeight: '600',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.2,
  } as TextStyle,

  h3: {
    fontFamily: fontFamily.headingRegular,
    fontWeight: '500',
    fontSize: 20,
    lineHeight: 26,
  } as TextStyle,

  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  bodyMedium: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  bodySmall: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  } as TextStyle,

  caption: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,

  button: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.1,
  } as TextStyle,

  // Numeric — the whole reason mono exists in this palette
  numericXL: {
    fontFamily: fontFamily.numericMedium,
    fontSize: 40,
    lineHeight: 44,
  } as TextStyle,

  numericLg: {
    fontFamily: fontFamily.numericMedium,
    fontSize: 24,
    lineHeight: 28,
  } as TextStyle,

  numericMd: {
    fontFamily: fontFamily.numericRegular,
    fontSize: 16,
    lineHeight: 20,
  } as TextStyle,

  numericSm: {
    fontFamily: fontFamily.numericRegular,
    fontSize: 13,
    lineHeight: 16,
  } as TextStyle,
} as const;

export type TypographyVariant = keyof typeof typography;
