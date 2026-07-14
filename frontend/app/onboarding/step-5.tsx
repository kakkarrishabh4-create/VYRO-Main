/**
 * Onboarding Step 5 — Summary
 *
 * Shows calculated daily calories + macro targets. "Looks good" POSTs the
 * profile to the backend and forwards to /home.
 */

import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  BodyText,
  Button,
  Card,
  Heading,
  Numeric,
  ProgressIndicator,
  StepHeader,
} from '@/src/components';
import {
  GOAL_LABELS,
  useOnboarding,
} from '@/src/context/OnboardingContext';
import { colors, spacing } from '@/src/theme';
import { storage } from '@/src/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const PROFILE_ID_KEY = 'vyro.profile.id';

export default function Step5() {
  const router = useRouter();
  const { answers, computeTargets, reset } = useOnboarding();
  const targets = useMemo(() => computeTargets(), [computeTargets]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!targets) {
    return (
      <View style={styles.flex}>
        <ProgressIndicator current={5} total={5} testID="progress-step-5" />
        <View style={styles.scrollPlain}>
          <StepHeader
            headline="Something's missing."
            subhead="Go back and complete the earlier steps."
            testID="step-5-header-incomplete"
          />
        </View>
      </View>
    );
  }

  const onConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: answers.name.trim(),
          age: parseInt(answers.age, 10),
          sex: answers.sex,
          height_cm: parseFloat(answers.heightCm),
          weight: parseFloat(answers.weight),
          weight_unit: answers.weightUnit,
          goal: answers.goal,
          job_activity: answers.jobActivity,
          sleep_hours: answers.sleepHours,
          stress: answers.stress,
          training_days: answers.trainingDays,
          experience: answers.experience,
          injuries: answers.injuries.trim(),
          equipment: answers.equipment,
          targets: {
            calories: targets.calories,
            protein_g: targets.proteinG,
            carbs_g: targets.carbsG,
            fat_g: targets.fatG,
            bmr: targets.bmr,
            tdee: targets.tdee,
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();
      await storage.setItem(PROFILE_ID_KEY, created.id);
      reset();
      router.replace({
        pathname: '/home',
        params: { profileId: created.id, name: created.name },
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not save profile — try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <ProgressIndicator current={5} total={5} testID="progress-step-5" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepHeader
          headline={`Here's your plan, ${answers.name.split(' ')[0] || 'friend'}.`}
          subhead={`Based on ${GOAL_LABELS[answers.goal!].title.toLowerCase()} as the current focus.`}
          testID="step-5-header"
        />

        {/* Calories */}
        <Card surface="ink" testID="summary-calories" style={styles.calCard}>
          <BodyText variant="label" tone="slate">
            Daily calories
          </BodyText>
          <View style={styles.calRow}>
            <Numeric variant="xl" tone="bone" testID="summary-calories-value">
              {targets.calories.toLocaleString()}
            </Numeric>
            <BodyText variant="bodySmall" tone="slate">
              kcal
            </BodyText>
          </View>
          <View style={styles.calSub}>
            <View style={styles.calSubItem}>
              <BodyText variant="caption" tone="slate">
                BMR
              </BodyText>
              <Numeric variant="sm" tone="slate">
                {targets.bmr.toLocaleString()}
              </Numeric>
            </View>
            <View style={styles.calSubItem}>
              <BodyText variant="caption" tone="slate">
                TDEE
              </BodyText>
              <Numeric variant="sm" tone="slate">
                {targets.tdee.toLocaleString()}
              </Numeric>
            </View>
          </View>
        </Card>

        {/* Macros */}
        <View style={styles.macrosLabel}>
          <BodyText variant="label" tone="slate">
            Macros
          </BodyText>
        </View>
        <View style={styles.macroList}>
          <MacroRow
            label="Protein"
            grams={targets.proteinG}
            calories={targets.proteinG * 4}
            testID="summary-macro-protein"
          />
          <MacroRow
            label="Carbohydrate"
            grams={targets.carbsG}
            calories={targets.carbsG * 4}
            testID="summary-macro-carbs"
          />
          <MacroRow
            label="Fat"
            grams={targets.fatG}
            calories={targets.fatG * 9}
            testID="summary-macro-fat"
          />
        </View>

        {/* Snapshot */}
        <View style={styles.snapshotWrap}>
          <BodyText variant="label" tone="slate" style={styles.macrosLabel}>
            Snapshot
          </BodyText>
          <View style={styles.snapshotList}>
            <SnapshotRow k="Age" v={`${answers.age}`} />
            <SnapshotRow k="Sex" v={answers.sex === 'male' ? 'Male' : 'Female'} />
            <SnapshotRow k="Height" v={`${answers.heightCm} cm`} />
            <SnapshotRow
              k="Weight"
              v={`${answers.weight} ${answers.weightUnit}`}
            />
            <SnapshotRow
              k="Training"
              v={`${answers.trainingDays}× / week`}
            />
            <SnapshotRow k="Sleep" v={`${answers.sleepHours} h`} />
          </View>
        </View>

        {error ? (
          <BodyText tone="brass" style={styles.error} testID="summary-error">
            {error}
          </BodyText>
        ) : null}

        <View style={styles.footer}>
          <Button
            label={saving ? 'Saving…' : 'Looks good'}
            iconRight="check"
            disabled={saving}
            testID="summary-confirm"
            onPress={onConfirm}
          />
          <View style={styles.gap}>
            <Button
              label="Adjust something"
              variant="secondary"
              surface="ink"
              iconLeft="arrow-left"
              disabled={saving}
              testID="summary-back"
              onPress={() => router.back()}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------- Small local rows ----------

const MacroRow: React.FC<{
  label: string;
  grams: number;
  calories: number;
  testID?: string;
}> = ({ label, grams, calories, testID }) => (
  <View style={styles.macroRow} testID={testID}>
    <View style={styles.macroLeft}>
      <Heading variant="h3" tone="bone">
        {label}
      </Heading>
      <BodyText variant="caption" tone="slate">
        {calories} kcal
      </BodyText>
    </View>
    <View style={styles.macroRight}>
      <Numeric variant="lg" tone="bone">
        {grams}
      </Numeric>
      <BodyText variant="caption" tone="slate">
        g
      </BodyText>
    </View>
  </View>
);

const SnapshotRow: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <View style={styles.snapRow}>
    <BodyText tone="slate">{k}</BodyText>
    <BodyText tone="bone">{v}</BodyText>
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  scrollPlain: {
    padding: spacing.lg,
  },
  calCard: {
    marginBottom: spacing.xl,
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  calSub: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineOnInk,
  },
  calSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  macrosLabel: {
    marginBottom: spacing.sm,
  },
  macroList: {
    borderTopWidth: 1,
    borderTopColor: colors.hairlineOnInk,
    marginBottom: spacing.xl,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineOnInk,
  },
  macroLeft: {
    // nothing
  },
  macroRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  snapshotWrap: {
    marginBottom: spacing.lg,
  },
  snapshotList: {
    borderTopWidth: 1,
    borderTopColor: colors.hairlineOnInk,
  },
  snapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineOnInk,
  },
  error: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  footer: {
    marginTop: spacing.lg,
  },
  gap: {
    marginTop: spacing.md,
  },
});
