/**
 * VYRO — ProgressIndicator
 *
 * Five thin dashes at the top of every onboarding step. Active dashes are
 * Moss; upcoming ones are hairline. No percentages, no big fills — the point
 * is to feel quiet and disciplined.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';

interface ProgressIndicatorProps {
  current: number; // 1-based
  total: number;
  testID?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  current,
  total,
  testID,
}) => {
  return (
    <View style={styles.row} testID={testID}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i < current;
        return (
          <View
            key={i}
            style={[
              styles.dash,
              { backgroundColor: active ? colors.moss : colors.hairlineOnInk },
            ]}
            testID={`progress-dash-${i + 1}`}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  dash: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
});
