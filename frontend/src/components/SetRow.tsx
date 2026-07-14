/**
 * VYRO — SetRow
 *
 * A single set inside an exercise: weight stepper + reps stepper + RPE
 * selector + subtle Moss check. Completed sets DO NOT get a full row color
 * change per the brief — only the checkmark switches to filled Moss.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

import { LineIcon } from './LineIcon';
import { NumberStepper } from './NumberStepper';
import { RPESelector } from './RPESelector';
import { BodyText, Numeric } from './Typography';

export interface SetState {
  weight: number;
  reps: number;
  rpe: number | null;
  completed: boolean;
}

interface SetRowProps {
  index: number;
  set: SetState;
  weightUnit: 'kg' | 'lb';
  weightStep: number;
  onChange: (patch: Partial<SetState>) => void;
  onComplete: () => void;
  testID?: string;
}

export const SetRow: React.FC<SetRowProps> = ({
  index,
  set,
  weightUnit,
  weightStep,
  onChange,
  onComplete,
  testID,
}) => {
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.header}>
        <View style={styles.setLabel}>
          <BodyText variant="caption" tone="slate">
            SET
          </BodyText>
          <Numeric variant="sm" tone="bone">
            {index + 1}
          </Numeric>
        </View>
        <Pressable
          onPress={onComplete}
          testID={`${testID}-check`}
          style={({ pressed }) => [
            styles.check,
            set.completed && styles.checkDone,
            pressed && !set.completed && styles.checkPressed,
          ]}
        >
          <LineIcon
            name="check"
            size={16}
            tone={set.completed ? 'bone' : 'slate'}
          />
        </Pressable>
      </View>

      <View style={styles.stepperRow}>
        <NumberStepper
          label={`Weight (${weightUnit})`}
          value={set.weight}
          onChange={(v) => onChange({ weight: v })}
          step={weightStep}
          min={0}
          max={999}
          testID={`${testID}-weight`}
        />
        <View style={styles.gutter} />
        <NumberStepper
          label="Reps"
          value={set.reps}
          onChange={(v) => onChange({ reps: v })}
          step={1}
          min={0}
          max={100}
          testID={`${testID}-reps`}
        />
      </View>

      <View style={styles.rpe}>
        <RPESelector
          value={set.rpe}
          onChange={(v) => onChange({ rpe: v })}
          testID={`${testID}-rpe`}
        />
      </View>
    </View>
  );
};

const CHECK_SIZE = 32;

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineOnInk,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  setLabel: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairlineOnInk,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inkSoft,
  },
  checkDone: {
    borderColor: colors.moss,
    backgroundColor: colors.moss,
  },
  checkPressed: {
    opacity: 0.6,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  gutter: {
    width: spacing.sm,
  },
  rpe: {
    marginTop: spacing.md,
  },
});
