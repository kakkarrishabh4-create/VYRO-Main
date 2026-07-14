/**
 * VYRO — ExerciseRow
 *
 * Collapsed: exercise name, target `sets × reps`, and the last-time line
 * directly beneath (Plex Mono, Slate) for context.
 * Expanded: reveals SetRow list + "Add set" secondary. Uses LayoutAnimation
 * so the expansion feels calm — not a slide-out panel.
 */

import React, { useCallback } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';

import { colors, spacing } from '../theme';

import { Button } from './Button';
import { LineIcon } from './LineIcon';
import { SetRow, SetState } from './SetRow';
import { BodyText, Heading, Numeric } from './Typography';

// Enable LayoutAnimation on Android.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface LastLogSet {
  weight: number;
  reps: number;
  rpe?: number | null;
}

interface ExerciseRowProps {
  name: string;
  targetSets: number;
  targetReps: string;
  weightUnit: 'kg' | 'lb';
  weightStep: number;
  lastLog?: { date: string; sets: LastLogSet[] } | null;
  sets: SetState[];
  expanded: boolean;
  onToggle: () => void;
  onSetChange: (index: number, patch: Partial<SetState>) => void;
  onSetComplete: (index: number) => void;
  onAddSet: () => void;
  testID?: string;
}

const formatLastLog = (sets: LastLogSet[], unit: string): string => {
  if (!sets || sets.length === 0) return '';
  // If every set has the same weight/reps, collapse: "4 × 6 · 80 kg"
  const allSame = sets.every(
    (s) => s.weight === sets[0].weight && s.reps === sets[0].reps
  );
  if (allSame) {
    return `${sets.length} × ${sets[0].reps} · ${sets[0].weight} ${unit}`;
  }
  // Otherwise show top set
  const top = sets.reduce(
    (best, s) => (s.weight > best.weight ? s : best),
    sets[0]
  );
  return `${sets.length} sets · top ${top.reps} × ${top.weight} ${unit}`;
};

export const ExerciseRow: React.FC<ExerciseRowProps> = ({
  name,
  targetSets,
  targetReps,
  weightUnit,
  weightStep,
  lastLog,
  sets,
  expanded,
  onToggle,
  onSetChange,
  onSetComplete,
  onAddSet,
  testID,
}) => {
  const completedCount = sets.filter((s) => s.completed).length;

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  }, [onToggle]);

  return (
    <View style={styles.wrap} testID={testID}>
      <Pressable
        onPress={handleToggle}
        testID={`${testID}-header`}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Heading variant="h3" tone="bone" style={styles.name}>
              {name}
            </Heading>
            {completedCount > 0 ? (
              <View style={styles.badge} testID={`${testID}-progress`}>
                <Numeric variant="sm" tone="moss">
                  {completedCount}
                </Numeric>
                <BodyText variant="caption" tone="slate">
                  /
                </BodyText>
                <Numeric variant="sm" tone="slate">
                  {sets.length}
                </Numeric>
              </View>
            ) : null}
          </View>
          <View style={styles.meta}>
            <Numeric variant="sm" tone="slate">
              {targetSets}
            </Numeric>
            <BodyText variant="caption" tone="slate">
              ×
            </BodyText>
            <Numeric variant="sm" tone="slate">
              {targetReps}
            </Numeric>
          </View>
          {lastLog && lastLog.sets.length > 0 ? (
            <View style={styles.lastLog} testID={`${testID}-last`}>
              <BodyText variant="caption" tone="slate">
                Last time ·{' '}
              </BodyText>
              <Numeric variant="sm" tone="slate">
                {formatLastLog(lastLog.sets, weightUnit)}
              </Numeric>
            </View>
          ) : (
            <BodyText variant="caption" tone="slate" style={styles.lastLog}>
              Last time · —
            </BodyText>
          )}
        </View>
        <LineIcon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          tone="slate"
        />
      </Pressable>

      {expanded ? (
        <View style={styles.body} testID={`${testID}-body`}>
          {sets.map((s, i) => (
            <SetRow
              key={i}
              index={i}
              set={s}
              weightUnit={weightUnit}
              weightStep={weightStep}
              onChange={(patch) => onSetChange(i, patch)}
              onComplete={() => onSetComplete(i)}
              testID={`${testID}-set-${i}`}
            />
          ))}
          <View style={styles.addSet}>
            <Button
              label="Add set"
              variant="secondary"
              iconLeft="plus"
              onPress={onAddSet}
              testID={`${testID}-add-set`}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineOnInk,
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerPressed: {
    opacity: 0.7,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  lastLog: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  body: {
    marginTop: spacing.sm,
  },
  addSet: {
    marginTop: spacing.md,
  },
});
