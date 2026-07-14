/**
 * VYRO — Typography primitives
 *
 * Three components, one job each:
 *  • <Heading>  → Fraunces, for headings only
 *  • <BodyText> → Inter, for body/labels/buttons
 *  • <Numeric>  → IBM Plex Mono, for anything that is a number
 *
 * Screens should NEVER use raw <Text> — always go through these so the
 * families/weights stay consistent app-wide.
 */

import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

import { ColorToken, colors, typography } from '../theme';

type HeadingVariant = 'display' | 'h1' | 'h2' | 'h3';
type BodyVariant = 'body' | 'bodyMedium' | 'bodySmall' | 'label' | 'caption' | 'button';
type NumericVariant = 'xl' | 'lg' | 'md' | 'sm';

interface BaseProps extends TextProps {
  tone?: ColorToken;
  style?: TextStyle | TextStyle[];
}

// ---------- Heading (Fraunces) ----------
interface HeadingProps extends BaseProps {
  variant?: HeadingVariant;
}

export const Heading: React.FC<HeadingProps> = ({
  variant = 'h1',
  tone = 'bone',
  style,
  children,
  ...rest
}) => (
  <Text
    {...rest}
    style={[typography[variant], { color: colors[tone] }, style]}
  >
    {children}
  </Text>
);

// ---------- BodyText (Inter) ----------
interface BodyTextProps extends BaseProps {
  variant?: BodyVariant;
}

export const BodyText: React.FC<BodyTextProps> = ({
  variant = 'body',
  tone = 'bone',
  style,
  children,
  ...rest
}) => (
  <Text
    {...rest}
    style={[typography[variant], { color: colors[tone] }, style]}
  >
    {children}
  </Text>
);

// ---------- Numeric (IBM Plex Mono) ----------
interface NumericProps extends BaseProps {
  variant?: NumericVariant;
}

const NUMERIC_MAP: Record<NumericVariant, keyof typeof typography> = {
  xl: 'numericXL',
  lg: 'numericLg',
  md: 'numericMd',
  sm: 'numericSm',
};

export const Numeric: React.FC<NumericProps> = ({
  variant = 'md',
  tone = 'bone',
  style,
  children,
  ...rest
}) => (
  <Text
    {...rest}
    style={[typography[NUMERIC_MAP[variant]], { color: colors[tone] }, style]}
  >
    {children}
  </Text>
);
