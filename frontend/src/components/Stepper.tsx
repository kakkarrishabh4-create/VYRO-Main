/**
 * VYRO — Stepper
 *
 * Big minus / big plus with a numeric readout in IBM Plex Mono. Used for
 * sleep hours and training days — better than a slider or dropdown per the
 * brief's "large tappable options" rule.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

import { LineIcon } from './LineIcon';
import { BodyText, Numeric } from './Typography';

interface StepperProps {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  testID?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  suffix,
  testID,
}) => {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <View>
      {label ? (
        <BodyText variant="label" tone="slate" style={styles.label}>
          {label}
        </BodyText>
      ) : null}
      <View style={styles.row} testID={testID}>
        <Pressable
          onPress={dec}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          testID={`${testID}-dec`}
          disabled={value <= min}
        >
          <LineIcon name="minus" size={20} tone="bone" />
        </Pressable>
        <View style={styles.readout}>
          <Numeric variant="lg" testID={`${testID}-value`}>
            {value}
          </Numeric>
          {suffix ? (
            <BodyText variant="caption" tone="slate" style={styles.suffix}>
              {suffix}
            </BodyText>
          ) : null}
        </View>
        <Pressable
          onPress={inc}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          testID={`${testID}-inc`}
          disabled={value >= max}
        >
          <LineIcon name="plus" size={20} tone="bone" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairlineOnInk,
    borderRadius: radius.md,
    backgroundColor: colors.inkSoft,
    height: 56,
  },
  btn: {
    width: 56,
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
    gap: spacing.sm,
  },
  suffix: {
    // caption
  },
});
