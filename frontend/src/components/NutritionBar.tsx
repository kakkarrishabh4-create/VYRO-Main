/**
 * VYRO — NutritionBar
 *
 * A compact horizontal summary — NOT a stat grid. One line for calories
 * (consumed vs target) and one row of three thin macro bars. Numbers are
 * IBM Plex Mono per the design rules.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';

import { BodyText, Numeric } from './Typography';

interface Macro {
  label: string;
  consumed: number;
  target: number;
}

interface NutritionBarProps {
  caloriesConsumed: number;
  caloriesTarget: number;
  protein: Macro;
  carbs: Macro;
  fat: Macro;
  testID?: string;
}

const clampPct = (v: number, t: number) => {
  if (t <= 0) return 0;
  return Math.max(0, Math.min(1, v / t));
};

interface MacroTrackProps {
  label: string;
  consumed: number;
  target: number;
  testID?: string;
}

const MacroTrack: React.FC<MacroTrackProps> = ({
  label,
  consumed,
  target,
  testID,
}) => {
  const pct = clampPct(consumed, target);
  return (
    <View style={styles.macro} testID={testID}>
      <View style={styles.macroHeader}>
        <BodyText variant="caption" tone="slate">
          {label}
        </BodyText>
        <View style={styles.macroNumbers}>
          <Numeric variant="sm" tone="bone">
            {consumed}
          </Numeric>
          <BodyText variant="caption" tone="slate">
            /
          </BodyText>
          <Numeric variant="sm" tone="slate">
            {target}
          </Numeric>
          <BodyText variant="caption" tone="slate">
            g
          </BodyText>
        </View>
      </View>
      <View style={styles.trackBg}>
        <View
          style={[
            styles.trackFill,
            { width: `${pct * 100}%` },
          ]}
        />
      </View>
    </View>
  );
};

export const NutritionBar: React.FC<NutritionBarProps> = ({
  caloriesConsumed,
  caloriesTarget,
  protein,
  carbs,
  fat,
  testID,
}) => {
  const remaining = Math.max(0, caloriesTarget - caloriesConsumed);
  const kcalPct = clampPct(caloriesConsumed, caloriesTarget);
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.calRow}>
        <View style={styles.calLeft}>
          <BodyText variant="label" tone="slate">
            Today's fuel
          </BodyText>
          <View style={styles.calNumbers}>
            <Numeric variant="lg" tone="bone" testID={`${testID}-cal-consumed`}>
              {caloriesConsumed.toLocaleString()}
            </Numeric>
            <BodyText variant="caption" tone="slate">
              /
            </BodyText>
            <Numeric variant="md" tone="slate" testID={`${testID}-cal-target`}>
              {caloriesTarget.toLocaleString()}
            </Numeric>
            <BodyText variant="caption" tone="slate">
              kcal
            </BodyText>
          </View>
        </View>
        <View style={styles.calRight}>
          <BodyText variant="caption" tone="slate">
            Remaining
          </BodyText>
          <Numeric variant="md" tone="bone" testID={`${testID}-cal-remaining`}>
            {remaining.toLocaleString()}
          </Numeric>
        </View>
      </View>

      {/* Main calorie track */}
      <View style={styles.trackBg}>
        <View style={[styles.trackFill, { width: `${kcalPct * 100}%` }]} />
      </View>

      {/* Three thin macro tracks */}
      <View style={styles.macros}>
        <MacroTrack
          label="Protein"
          consumed={protein.consumed}
          target={protein.target}
          testID={`${testID}-protein`}
        />
        <MacroTrack
          label="Carbs"
          consumed={carbs.consumed}
          target={carbs.target}
          testID={`${testID}-carbs`}
        />
        <MacroTrack
          label="Fat"
          consumed={fat.consumed}
          target={fat.target}
          testID={`${testID}-fat`}
        />
      </View>
    </View>
  );
};

const TRACK_HEIGHT = 4;

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.hairlineOnInk,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineOnInk,
    paddingVertical: spacing.md,
  },
  calRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  calLeft: {},
  calRight: {
    alignItems: 'flex-end',
  },
  calNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  trackBg: {
    height: TRACK_HEIGHT,
    backgroundColor: colors.hairlineOnInk,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: colors.moss,
    borderRadius: TRACK_HEIGHT / 2,
  },
  macros: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  macro: {},
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  macroNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
});
