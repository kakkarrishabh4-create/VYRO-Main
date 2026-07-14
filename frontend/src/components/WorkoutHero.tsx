/**
 * VYRO — WorkoutHero
 *
 * The primary journal entry for today. Deliberately NOT a card grid — a
 * single left-aligned block with the workout name in Fraunces, meta in
 * Inter, and a Moss "Start workout" CTA. Feels like a coach's note, not a
 * dashboard tile.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';

import { Button } from './Button';
import { LineIcon } from './LineIcon';
import { BodyText, Heading, Numeric } from './Typography';

interface WorkoutHeroProps {
  name: string;
  exercises: number;
  durationMin: number;
  onStart: () => void;
  testID?: string;
}

export const WorkoutHero: React.FC<WorkoutHeroProps> = ({
  name,
  exercises,
  durationMin,
  onStart,
  testID,
}) => {
  return (
    <View style={styles.wrap} testID={testID}>
      <BodyText variant="label" tone="slate">
        Today's session
      </BodyText>
      <Heading variant="h1" style={styles.name} testID={`${testID}-name`}>
        {name}
      </Heading>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <LineIcon name="list" size={14} tone="slate" />
          <Numeric variant="sm" tone="slate" testID={`${testID}-exercises`}>
            {exercises}
          </Numeric>
          <BodyText variant="caption" tone="slate">
            exercises
          </BodyText>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <LineIcon name="clock" size={14} tone="slate" />
          <Numeric variant="sm" tone="slate" testID={`${testID}-duration`}>
            {durationMin}
          </Numeric>
          <BodyText variant="caption" tone="slate">
            min
          </BodyText>
        </View>
      </View>
      <Button
        label="Start workout"
        iconRight="arrow-right"
        testID={`${testID}-start`}
        onPress={onStart}
        style={styles.cta}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    // no card border, no card feel — this is the hero block itself
  },
  name: {
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.hairlineOnInk,
  },
  cta: {
    // stretched full width by default
  },
});
