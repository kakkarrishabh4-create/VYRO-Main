/**
 * Onboarding Step 3 — Lifestyle
 * Job activity / sleep / stress / training days.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  BodyText,
  Button,
  OptionCard,
  ProgressIndicator,
  StepHeader,
  Stepper,
} from '@/src/components';
import { useOnboarding } from '@/src/context/OnboardingContext';
import { spacing } from '@/src/theme';

const JOB_OPTIONS = [
  { key: 'desk', title: 'Desk', desc: 'Mostly seated, low movement.' },
  { key: 'active', title: 'Active', desc: 'On feet regularly, some walking.' },
  { key: 'manual', title: 'Manual labor', desc: 'Physical work most of the day.' },
] as const;

const STRESS_OPTIONS = [
  { key: 'low', title: 'Low' },
  { key: 'moderate', title: 'Moderate' },
  { key: 'high', title: 'High' },
] as const;

export default function Step3() {
  const router = useRouter();
  const { answers, update } = useOnboarding();

  const canContinue = answers.jobActivity !== null && answers.stress !== null;

  return (
    <View style={styles.flex}>
      <ProgressIndicator current={3} total={5} testID="progress-step-3" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepHeader
          headline="How does your day usually go?"
          subhead="Context matters — recovery is built outside the gym."
          testID="step-3-header"
        />

        {/* Job activity */}
        <View style={styles.section}>
          <BodyText variant="label" tone="slate" style={styles.label}>
            Day job activity
          </BodyText>
          <View style={styles.list}>
            {JOB_OPTIONS.map((o) => (
              <OptionCard
                key={o.key}
                title={o.title}
                description={o.desc}
                selected={answers.jobActivity === o.key}
                onPress={() => update({ jobActivity: o.key })}
                testID={`option-job-${o.key}`}
              />
            ))}
          </View>
        </View>

        {/* Sleep */}
        <View style={styles.section}>
          <Stepper
            label="Average sleep"
            value={answers.sleepHours}
            onChange={(v) => update({ sleepHours: v })}
            min={3}
            max={12}
            suffix="hours / night"
            testID="stepper-sleep"
          />
        </View>

        {/* Stress */}
        <View style={styles.section}>
          <BodyText variant="label" tone="slate" style={styles.label}>
            Current stress level
          </BodyText>
          <View style={styles.stressRow}>
            {STRESS_OPTIONS.map((o) => (
              <OptionCard
                key={o.key}
                title={o.title}
                selected={answers.stress === o.key}
                onPress={() => update({ stress: o.key })}
                testID={`option-stress-${o.key}`}
                style={styles.stressOption}
              />
            ))}
          </View>
        </View>

        {/* Training days */}
        <View style={styles.section}>
          <Stepper
            label="Training days per week"
            value={answers.trainingDays}
            onChange={(v) => update({ trainingDays: v })}
            min={1}
            max={7}
            suffix="days"
            testID="stepper-training-days"
          />
        </View>

        <View style={styles.footer}>
          <Button
            label="Continue"
            iconRight="arrow-right"
            disabled={!canContinue}
            testID="step-3-continue"
            onPress={() => router.push('/onboarding/step-4')}
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
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  stressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stressOption: {
    flex: 1,
  },
  footer: {
    marginTop: spacing.md,
  },
});
