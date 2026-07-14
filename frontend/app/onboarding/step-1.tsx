/**
 * Onboarding Step 1 — Basic info
 * Name / age / sex / height / weight + kg-lb toggle.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  BodyText,
  Button,
  OptionCard,
  ProgressIndicator,
  StepHeader,
  Stepper,
  TextField,
  UnitToggle,
} from '@/src/components';
import { useOnboarding } from '@/src/context/OnboardingContext';
import { spacing } from '@/src/theme';

export default function Step1() {
  const router = useRouter();
  const { answers, update } = useOnboarding();

  const ageNum = parseInt(answers.age, 10);
  const heightNum = parseInt(answers.heightCm, 10);
  const weightNum = parseFloat(answers.weight);
  const canContinue =
    answers.name.trim().length > 0 &&
    !Number.isNaN(ageNum) &&
    ageNum >= 13 &&
    ageNum <= 100 &&
    answers.sex !== null &&
    !Number.isNaN(heightNum) &&
    heightNum > 80 &&
    !Number.isNaN(weightNum) &&
    weightNum > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ProgressIndicator current={1} total={5} testID="progress-step-1" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <StepHeader
          headline="Let's start with the basics."
          subhead="A few numbers so training and food land where they should."
          showBack={false}
          testID="step-1-header"
        />

        <View style={styles.field}>
          <TextField
            label="Your name"
            value={answers.name}
            onChangeText={(v) => update({ name: v })}
            placeholder="Alex Rivera"
            maxLength={40}
            testID="input-name"
          />
        </View>

        <View style={styles.field}>
          <TextField
            label="Age"
            value={answers.age}
            onChangeText={(v) => update({ age: v.replace(/[^0-9]/g, '') })}
            placeholder="28"
            numeric
            keyboardType="number-pad"
            maxLength={3}
            testID="input-age"
          />
        </View>

        <View style={styles.field}>
          <BodyText variant="label" tone="slate" style={styles.label}>
            Sex
          </BodyText>
          <View style={styles.sexRow}>
            <OptionCard
              title="Male"
              selected={answers.sex === 'male'}
              onPress={() => update({ sex: 'male' })}
              testID="option-sex-male"
              style={styles.sexOption}
            />
            <OptionCard
              title="Female"
              selected={answers.sex === 'female'}
              onPress={() => update({ sex: 'female' })}
              testID="option-sex-female"
              style={styles.sexOption}
            />
          </View>
          <BodyText variant="caption" tone="slate" style={styles.hint}>
            Used only for the BMR calculation.
          </BodyText>
        </View>

        <View style={styles.field}>
          <TextField
            label="Height"
            value={answers.heightCm}
            onChangeText={(v) => update({ heightCm: v.replace(/[^0-9]/g, '') })}
            placeholder="175"
            numeric
            keyboardType="number-pad"
            maxLength={3}
            suffix="cm"
            testID="input-height"
          />
        </View>

        <View style={styles.field}>
          <View style={styles.weightRow}>
            <BodyText variant="label" tone="slate">
              Current weight
            </BodyText>
            <UnitToggle
              value={answers.weightUnit}
              options={['kg', 'lb'] as const}
              onChange={(v) => update({ weightUnit: v })}
              testID="toggle-weight-unit"
            />
          </View>
          <TextField
            value={answers.weight}
            onChangeText={(v) =>
              update({ weight: v.replace(/[^0-9.]/g, '') })
            }
            placeholder={answers.weightUnit === 'kg' ? '72.5' : '160'}
            numeric
            keyboardType="decimal-pad"
            maxLength={6}
            suffix={answers.weightUnit}
            testID="input-weight"
          />
        </View>

        <View style={styles.footer}>
          <Button
            label="Continue"
            iconRight="arrow-right"
            disabled={!canContinue}
            testID="step-1-continue"
            onPress={() => router.push('/onboarding/step-2')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
  },
  sexRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sexOption: {
    flex: 1,
  },
  hint: {
    marginTop: spacing.sm,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  footer: {
    marginTop: spacing.md,
  },
});

// Suppress the unused Stepper import (Stepper isn't used in this step,
// leaving barrel import consistent for other steps).
void Stepper;
