/**
 * VYRO — WeightStepper / RepsStepper
 *
 * Large tappable numeric steppers optimized for the logging flow. Similar
 * shape to `Stepper` but with a different visual weight and long-press
 * repeat is intentionally NOT added — brief says "large tappable" and
 * discipline > convenience.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

import { LineIcon } from './LineIcon';
import { BodyText, Numeric } from './Typography';

interface NumberStepperProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  label?: string;
  testID?: string;
  disabled?: boolean;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  suffix,
  label,
  testID,
  disabled = false,
}) => {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));

  return (
    <View style={styles.wrap} testID={testID}>
      {label ? (
        <BodyText variant="caption" tone="slate" style={styles.label}>
          {label}
        </BodyText>
      ) : null}
      <View style={[styles.row, disabled && styles.disabled]}>
        <Pressable
          onPress={dec}
          disabled={disabled || value <= min}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          testID={`${testID}-dec`}
        >
          <LineIcon name="minus" size={16} tone="bone" />
        </Pressable>
        <View style={styles.readout}>
          <Numeric variant="md" testID={`${testID}-value`}>
            {formatNumber(value)}
          </Numeric>
          {suffix ? (
            <BodyText variant="caption" tone="slate">
              {suffix}
            </BodyText>
          ) : null}
        </View>
        <Pressable
          onPress={inc}
          disabled={disabled || value >= max}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          testID={`${testID}-inc`}
        >
          <LineIcon name="plus" size={16} tone="bone" />
        </Pressable>
      </View>
    </View>
  );
};

const formatNumber = (n: number): string => {
  // whole numbers show without trailing .0; halves show one decimal
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  label: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairlineOnInk,
    borderRadius: radius.md,
    backgroundColor: colors.inkSoft,
    height: 48,
  },
  disabled: {
    opacity: 0.5,
  },
  btn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.5,
  },
  readout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
  },
});
