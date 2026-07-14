/**
 * Onboarding Step 4 — Training background
 * Experience / injuries / equipment access.
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
  TextField,
} from '@/src/components';
import { useOnboarding } from '@/src/context/OnboardingContext';
import { spacing } from '@/src/theme';

const EXP_OPTIONS = [
  { key: 'beginner', title: 'Beginner', desc: 'Under a year of consistent training.' },
  { key: 'intermediate', title: 'Intermediate', desc: '1–3 years, know the main lifts.' },
  { key: 'advanced', title: 'Advanced', desc: '3+ years, structured programming.' },
] as const;

const EQ_OPTIONS = [
  { key: 'gym', title: 'Full gym', desc: 'Barbells, racks, machines.' },
  { key: 'home', title: 'Home setup', desc: 'Dumbbells, bands, bodyweight.' },
  { key: 'none', title: 'None yet', desc: 'Bodyweight only for now.' },
] as const;

export default function Step4() {
  const router = useRouter();
  const { answers, update } = useOnboarding();

  const canContinue =
    answers.experience !== null && answers.equipment !== null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ProgressIndicator current={4} total={5} testID="progress-step-4" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <StepHeader
          headline="Where are you in training?"
          subhead="This shapes intensity, volume, and exercise selection."
          testID="step-4-header"
        />

        {/* Experience */}
        <View style={styles.section}>
          <BodyText variant="label" tone="slate" style={styles.label}>
            Experience level
          </BodyText>
          <View style={styles.list}>
            {EXP_OPTIONS.map((o) => (
              <OptionCard
                key={o.key}
                title={o.title}
                description={o.desc}
                selected={answers.experience === o.key}
                onPress={() => update({ experience: o.key })}
                testID={`option-exp-${o.key}`}
              />
            ))}
          </View>
        </View>

        {/* Injuries */}
        <View style={styles.section}>
          <TextField
            label="Injuries or limitations"
            value={answers.injuries}
            onChangeText={(v) => update({ injuries: v })}
            placeholder="Left knee tweak, no overhead pressing — anything I should know."
            multiline
            numberOfLines={4}
            maxLength={500}
            testID="input-injuries"
          />
          <BodyText variant="caption" tone="slate" style={styles.hint}>
            Optional. Leave empty if you're all clear.
          </BodyText>
        </View>

        {/* Equipment */}
        <View style={styles.section}>
          <BodyText variant="label" tone="slate" style={styles.label}>
            Equipment access
          </BodyText>
          <View style={styles.list}>
            {EQ_OPTIONS.map((o) => (
              <OptionCard
                key={o.key}
                title={o.title}
                description={o.desc}
                selected={answers.equipment === o.key}
                onPress={() => update({ equipment: o.key })}
                testID={`option-eq-${o.key}`}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label="See my targets"
            iconRight="arrow-right"
            disabled={!canContinue}
            testID="step-4-continue"
            onPress={() => router.push('/onboarding/step-5')}
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
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  hint: {
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.md,
  },
});
