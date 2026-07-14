/**
 * VYRO — Workout summary.
 *
 * Route: /workout/summary
 * Reads the last-completed summary from storage and renders:
 *  • total volume + sets completed (Plex Mono)
 *  • up/down comparison vs previous same-name workout — in Moss (up) or
 *    Slate (down or flat). NOT red/green — the design system stays consistent.
 *  • per-exercise breakdown
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BodyText,
  Button,
  Heading,
  LineIcon,
  Numeric,
} from '@/src/components';
import { colors, spacing } from '@/src/theme';
import { storage } from '@/src/utils/storage';

const LAST_SUMMARY_KEY = 'vyro.workout.lastSummary';

interface Summary {
  id: string;
  workout_name: string;
  weight_unit: 'kg' | 'lb';
  date: string;
  duration_min: number | null;
  total_volume: number;
  sets_completed: number;
  exercises: { name: string; sets_completed: number; volume: number }[];
  previous_total_volume: number | null;
  previous_sets_completed: number | null;
  volume_delta_pct: number | null;
  sets_delta: number | null;
}

interface DeltaProps {
  value: number | null;
  format: (v: number) => string;
  testID?: string;
}

/**
 * Comparison indicator: arrow-up in Moss for gains, arrow-down in Slate
 * for regressions, minus in Slate for flat. Never red/green.
 */
const Delta: React.FC<DeltaProps> = ({ value, format, testID }) => {
  if (value === null || value === undefined) {
    return (
      <BodyText variant="caption" tone="slate" testID={testID}>
        First time
      </BodyText>
    );
  }
  const up = value > 0;
  const flat = value === 0;
  const iconName = flat ? 'minus' : up ? 'arrow-up' : 'arrow-down';
  const tone = up ? 'moss' : 'slate';
  return (
    <View style={styles.delta} testID={testID}>
      <LineIcon name={iconName} size={14} tone={tone} />
      <Numeric variant="sm" tone={tone}>
        {format(Math.abs(value))}
      </Numeric>
    </View>
  );
};

export default function WorkoutSummary() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await storage.getItem<string>(LAST_SUMMARY_KEY, '');
      if (cancelled) return;
      if (raw && raw.length > 0) {
        try {
          setSummary(JSON.parse(raw) as Summary);
        } catch {
          setSummary(null);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;

  if (!summary) {
    return (
      <SafeAreaView style={styles.safe} testID="summary-empty">
        <View style={styles.centered}>
          <Heading variant="h3">No workout to summarize.</Heading>
          <BodyText tone="slate" style={styles.centeredBody}>
            Complete a workout to see this screen.
          </BodyText>
          <Button
            label="Back to today"
            iconLeft="arrow-left"
            onPress={() => router.replace('/home')}
            testID="summary-back-home"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        testID="summary-root"
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <BodyText variant="label" tone="slate">
              Session logged
            </BodyText>
            <Heading variant="h1" style={styles.title} testID="summary-title">
              {summary.workout_name}
            </Heading>
          </View>
          <View style={styles.check}>
            <LineIcon name="check" size={20} tone="bone" />
          </View>
        </View>

        {/* Top stats */}
        <View style={styles.statBlock} testID="summary-stat-volume">
          <BodyText variant="label" tone="slate">
            Total volume
          </BodyText>
          <View style={styles.statRow}>
            <View style={styles.statNumbers}>
              <Numeric variant="xl" tone="bone" testID="summary-volume-value">
                {summary.total_volume.toLocaleString()}
              </Numeric>
              <BodyText variant="bodySmall" tone="slate">
                {summary.weight_unit}
              </BodyText>
            </View>
            <Delta
              value={summary.volume_delta_pct}
              format={(v) => `${v.toFixed(1)}%`}
              testID="summary-volume-delta"
            />
          </View>
          {summary.previous_total_volume !== null ? (
            <BodyText variant="caption" tone="slate" style={styles.prevLine}>
              Last time · {summary.previous_total_volume.toLocaleString()}{' '}
              {summary.weight_unit}
            </BodyText>
          ) : null}
        </View>

        <View style={styles.statBlock} testID="summary-stat-sets">
          <BodyText variant="label" tone="slate">
            Sets completed
          </BodyText>
          <View style={styles.statRow}>
            <Numeric variant="xl" tone="bone" testID="summary-sets-value">
              {summary.sets_completed}
            </Numeric>
            <Delta
              value={summary.sets_delta}
              format={(v) => `${v} sets`}
              testID="summary-sets-delta"
            />
          </View>
          {summary.previous_sets_completed !== null ? (
            <BodyText variant="caption" tone="slate" style={styles.prevLine}>
              Last time · {summary.previous_sets_completed} sets
            </BodyText>
          ) : null}
        </View>

        {/* Per-exercise breakdown */}
        <View style={styles.section}>
          <BodyText variant="label" tone="slate" style={styles.sectionLabel}>
            Breakdown
          </BodyText>
          <View style={styles.exList}>
            {summary.exercises.map((ex, i) => (
              <View
                key={`${ex.name}-${i}`}
                style={styles.exRow}
                testID={`summary-exercise-${i}`}
              >
                <View style={styles.exLeft}>
                  <BodyText variant="bodyMedium" tone="bone">
                    {ex.name}
                  </BodyText>
                  <View style={styles.exMeta}>
                    <Numeric variant="sm" tone="slate">
                      {ex.sets_completed}
                    </Numeric>
                    <BodyText variant="caption" tone="slate">
                      sets
                    </BodyText>
                  </View>
                </View>
                <View style={styles.exRight}>
                  <Numeric variant="md" tone="bone">
                    {ex.volume.toLocaleString()}
                  </Numeric>
                  <BodyText variant="caption" tone="slate">
                    {summary.weight_unit}
                  </BodyText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label="Back to today"
            iconRight="arrow-right"
            onPress={() => router.replace('/home')}
            testID="summary-done"
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    marginTop: spacing.xs,
  },
  check: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.moss,
    backgroundColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBlock: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineOnInk,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  statNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  prevLine: {
    marginTop: 4,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  exList: {
    borderTopWidth: 1,
    borderTopColor: colors.hairlineOnInk,
  },
  exRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineOnInk,
  },
  exLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  exMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  exRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  footer: {
    marginTop: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  centeredBody: {
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
