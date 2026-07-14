/**
 * Onboarding Step 2 — Goal (single-select cards)
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  OptionCard,
  ProgressIndicator,
  StepHeader,
} from '@/src/components';
import {
  GOAL_LABELS,
  Goal,
  useOnboarding,
} from '@/src/context/OnboardingContext';
import { spacing } from '@/src/theme';

const GOAL_ORDER: Goal[] = [
  'fat_loss',
  'muscle_gain',
  'recomposition',
  'general',
  'endurance',
];

export default function Step2() {
  const router = useRouter();
  const { answers, update } = useOnboarding();

  return (
    <View style={styles.flex}>
      <ProgressIndicator current={2} total={5} testID="progress-step-2" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepHeader
          headline="What are we working toward?"
          subhead="Pick the one that fits right now — you can shift focus later."
          testID="step-2-header"
        />

        <View style={styles.list}>
          {GOAL_ORDER.map((g) => (
            <OptionCard
              key={g}
              title={GOAL_LABELS[g].title}
              description={GOAL_LABELS[g].desc}
              selected={answers.goal === g}
              onPress={() => update({ goal: g })}
              testID={`option-goal-${g}`}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            label="Continue"
            iconRight="arrow-right"
            disabled={answers.goal === null}
            testID="step-2-continue"
            onPress={() => router.push('/onboarding/step-3')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  list: {
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
