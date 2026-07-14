/**
 * VYRO — Button
 *
 * Two variants:
 *  • primary   → solid Moss fill, Bone text
 *  • secondary → transparent fill, hairline border, current-context text
 *
 * Radius stays at 8px — never pill. No shadows. Simple pressed-state via
 * Moss-muted for primary and hairline-fade for secondary.
 */

import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '../theme';

import { BodyText } from './Typography';
import { LineIcon, LineIconProps } from './LineIcon';

type Variant = 'primary' | 'secondary';
type Surface = 'ink' | 'bone'; // surface the button sits on

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  surface?: Surface;
  iconLeft?: LineIconProps['name'];
  iconRight?: LineIconProps['name'];
  fullWidth?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  surface = 'ink',
  iconLeft,
  iconRight,
  fullWidth = true,
  disabled = false,
  style,
  testID,
  ...pressableProps
}) => {
  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'primary' && styles.primary,
        variant === 'primary' && pressed && styles.primaryPressed,
        variant === 'secondary' && styles.secondaryBase,
        variant === 'secondary' && surface === 'ink' && styles.secondaryOnInk,
        variant === 'secondary' && surface === 'bone' && styles.secondaryOnBone,
        variant === 'secondary' && pressed && styles.secondaryPressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.inner}>
        {iconLeft ? (
          <LineIcon
            name={iconLeft}
            size={18}
            tone={variant === 'primary' ? 'bone' : surface === 'ink' ? 'bone' : 'ink'}
          />
        ) : null}
        <BodyText
          variant="button"
          tone={variant === 'primary' ? 'bone' : surface === 'ink' ? 'bone' : 'ink'}
        >
          {label}
        </BodyText>
        {iconRight ? (
          <LineIcon
            name={iconRight}
            size={18}
            tone={variant === 'primary' ? 'bone' : surface === 'ink' ? 'bone' : 'ink'}
          />
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md, // 8, per the brief
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.moss,
  },
  primaryPressed: {
    backgroundColor: colors.mossMuted,
  },
  secondaryBase: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  secondaryOnInk: {
    borderColor: colors.hairlineOnInk,
  },
  secondaryOnBone: {
    borderColor: colors.hairlineOnBone,
  },
  secondaryPressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
});
