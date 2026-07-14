/**
 * VYRO — Today's workout (placeholder for the exercise-by-exercise logger).
 *
 * The Start Workout CTA on the home screen navigates here. Full set-by-set
 * logging is a separate iteration — this screen confirms the plan and
 * acknowledges that logging is next.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BodyText,
  Button,
  Card,
  Heading,
  LineIcon,
  Numeric,
  StepHeader,
} from '@/src/components';
import { colors, spacing } from '@/src/theme';

export default function WorkoutToday() {
  const router = useRouter();
  const { name, exercises, duration } = useLocalSearchParams<{
    name?: string;
    exercises?: string;
    duration?: string;
  }>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} testID="workout-today-root">
        <StepHeader
          headline={typeof name === 'string' ? name : "Today's session"}
          subhead="Ready when you are."
        />

        <Card surface="ink" style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <LineIcon name="list" size={16} tone="slate" />
              <BodyText tone="slate">Exercises</BodyText>
            </View>
            <Numeric variant="md" tone="bone">
              {typeof exercises === 'string' ? exercises : '—'}
            </Numeric>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <LineIcon name="clock" size={16} tone="slate" />
              <BodyText tone="slate">Estimated duration</BodyText>
            </View>
            <View style={styles.durationRow}>
              <Numeric variant="md" tone="bone">
                {typeof duration === 'string' ? duration : '—'}
              </Numeric>
              <BodyText variant="caption" tone="slate">
                min
              </BodyText>
            </View>
          </View>
        </Card>

        <View style={styles.note}>
          <Heading variant="h3">Set-by-set logging</Heading>
          <BodyText tone="slate" style={styles.noteBody}>
            Coming next — this is where each lift, its target reps, and last
            week's weight will sit, ready to be checked off as you go.
          </BodyText>
        </View>

        <View style={styles.footer}>
          <Button
            label="Back to today"
            variant="secondary"
            iconLeft="arrow-left"
            testID="workout-back"
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.hairlineOnInk,
    marginVertical: spacing.sm,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  note: {
    marginBottom: spacing.xl,
  },
  noteBody: {
    marginTop: spacing.sm,
  },
  footer: {},
});
