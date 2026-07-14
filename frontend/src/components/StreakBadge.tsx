/**
 * VYRO — StreakBadge
 *
 * The ONE place we use Brass in the app right now. Renders nothing unless
 * `days >= 3` — per brief, streaks below that aren't worth celebrating and
 * showing zero-state noise would cheapen the signal.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

import { LineIcon } from './LineIcon';
import { BodyText, Numeric } from './Typography';

interface StreakBadgeProps {
  days: number;
  testID?: string;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ days, testID }) => {
  if (days < 3) return null;
  return (
    <View style={styles.wrap} testID={testID}>
      <LineIcon name="zap" size={14} tone="brass" />
      <Numeric variant="sm" tone="brass" testID={`${testID}-value`}>
        {days}
      </Numeric>
      <BodyText variant="caption" tone="brass">
        day streak
      </BodyText>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.brass,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
});
