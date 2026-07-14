/**
 * VYRO — Card
 *
 * A quiet surface for content. NOT a floating dashboard tile — the brief
 * explicitly rejects card-grid layouts. Use Card for occasional grouped
 * blocks (settings, forms, summaries). Journal entries are NOT cards; use
 * the Thread + row layout for those instead.
 *
 * Elevation is a 1px hairline border. No shadows.
 */

import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme';

type Surface = 'ink' | 'bone';

export interface CardProps extends ViewProps {
  surface?: Surface;
  padding?: keyof typeof spacing;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  surface = 'ink',
  padding = 'md',
  style,
  children,
  ...rest
}) => {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          backgroundColor: surface === 'ink' ? colors.inkSoft : colors.bone,
          borderColor:
            surface === 'ink' ? colors.hairlineOnInk : colors.hairlineOnBone,
          padding: spacing[padding],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    // No shadowColor / elevation — the brief bans drop shadows entirely.
  },
});
