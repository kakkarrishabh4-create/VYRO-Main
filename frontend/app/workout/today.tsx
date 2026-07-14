/**
 * VYRO — Today's workout: detail + inline logging.
 *
 * Route: /workout/today
 * Reads profile id from AsyncStorage (or router param on the way in) and
 * loads /api/profiles/{id}/workouts/today. Each exercise is a row that
 * expands inline (LayoutAnimation) into a SetRow list. Completing a set
 * mounts the RestTimer overlay at the bottom of the screen.
 * "Finish workout" POSTs to /workouts/complete and navigates to summary.
 */

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BodyText,
  Button,
  ExerciseRow,
  Heading,
  LastLogSet,
  LineIcon,
  Numeric,
  RestTimer,
  SetState,
} from '@/src/components';
import { colors, spacing } from '@/src/theme';
import { storage } from '@/src/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const PROFILE_ID_KEY = 'vyro.profile.id';

interface ExerciseDetail {
  id: string;
  name: string;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
  starter_weight: number;
  last_log: { date: string; sets: LastLogSet[] } | null;
}

interface WorkoutDetail {
  profile_id: string;
  workout_name: string;
  weight_unit: 'kg' | 'lb';
  duration_min: number;
  exercises: ExerciseDetail[];
}

interface ExerciseState {
  detail: ExerciseDetail;
  sets: SetState[];
  expanded: boolean;
}

const buildInitialSets = (ex: ExerciseDetail): SetState[] => {
  // Prefer to prefill from last log; else fall back to target reps + starter.
  const digitsFirstRun = (s: string): number => {
    let out = '';
    for (const c of s) {
      if (/\d/.test(c)) out += c;
      else if (out) break;
    }
    return out ? parseInt(out, 10) : 8;
  };
  const targetReps = digitsFirstRun(ex.target_reps);

  return Array.from({ length: ex.target_sets }).map((_, i) => {
    const prev = ex.last_log?.sets[i];
    return {
      weight: prev?.weight ?? ex.starter_weight,
      reps: prev?.reps ?? targetReps,
      rpe: null,
      completed: false,
    };
  });
};

export default function WorkoutToday() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Rest timer state — key increments each time to remount and reset the clock.
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restKey, setRestKey] = useState(0);

  // Resolve profile id from storage on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await storage.getItem<string>(PROFILE_ID_KEY, '');
      if (cancelled) return;
      setProfileId(id && id.length > 0 ? id : null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch workout detail when profile id is known.
  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/api/profiles/${profileId}/workouts/today`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as WorkoutDetail;
        if (cancelled) return;
        setWorkout(data);
        setExercises(
          data.exercises.map((ex, i) => ({
            detail: ex,
            sets: buildInitialSets(ex),
            expanded: i === 0, // first one open by default
          }))
        );
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Could not load workout.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const toggleExercise = useCallback((idx: number) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, expanded: !e.expanded } : e))
    );
  }, []);

  const patchSet = useCallback(
    (exIdx: number, setIdx: number, patch: Partial<SetState>) => {
      setExercises((prev) =>
        prev.map((e, i) => {
          if (i !== exIdx) return e;
          return {
            ...e,
            sets: e.sets.map((s, si) =>
              si === setIdx ? { ...s, ...patch } : s
            ),
          };
        })
      );
    },
    []
  );

  const completeSet = useCallback(
    (exIdx: number, setIdx: number) => {
      let restForThis = 90;
      setExercises((prev) =>
        prev.map((e, i) => {
          if (i !== exIdx) return e;
          restForThis = e.detail.rest_seconds || 90;
          return {
            ...e,
            sets: e.sets.map((s, si) =>
              si === setIdx ? { ...s, completed: !s.completed } : s
            ),
          };
        })
      );
      // Only start rest when transitioning to completed=true.
      const wasCompleted = exercises[exIdx]?.sets[setIdx]?.completed;
      if (!wasCompleted && restForThis > 0) {
        setRestSeconds(restForThis);
        setRestKey((k) => k + 1);
      }
    },
    [exercises]
  );

  const addSet = useCallback((exIdx: number) => {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        const last = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              weight: last?.weight ?? e.detail.starter_weight,
              reps: last?.reps ?? 8,
              rpe: null,
              completed: false,
            },
          ],
        };
      })
    );
  }, []);

  const totals = useMemo(() => {
    let volume = 0;
    let completed = 0;
    for (const e of exercises) {
      for (const s of e.sets) {
        if (s.completed) {
          volume += s.weight * s.reps;
          completed += 1;
        }
      }
    }
    return { volume, completed };
  }, [exercises]);

  const finish = useCallback(async () => {
    if (!profileId || !workout || totals.completed === 0) return;
    setSaving(true);
    try {
      const payload = {
        workout_name: workout.workout_name,
        weight_unit: workout.weight_unit,
        duration_min: workout.duration_min,
        exercises: exercises
          .map((e) => ({
            name: e.detail.name,
            sets: e.sets
              .filter((s) => s.completed)
              .map((s) => ({
                weight: s.weight,
                reps: s.reps,
                rpe: s.rpe ?? null,
              })),
          }))
          .filter((e) => e.sets.length > 0),
      };
      const res = await fetch(
        `${API_URL}/api/profiles/${profileId}/workouts/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const summary = await res.json();
      await storage.setItem('vyro.workout.lastSummary', JSON.stringify(summary));
      router.replace('/workout/summary');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save workout.');
    } finally {
      setSaving(false);
    }
  }, [profileId, workout, exercises, totals.completed, router]);

  // ---------- states ----------
  if (!profileId && !loading) {
    return (
      <SafeAreaView style={styles.safe} testID="workout-empty">
        <View style={styles.centered}>
          <Heading variant="h2" tone="bone">
            No profile yet.
          </Heading>
          <BodyText tone="slate" style={styles.centeredBody}>
            Finish onboarding first.
          </BodyText>
          <Button
            label="Go to onboarding"
            onPress={() => router.replace('/')}
            testID="workout-go-onboarding"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} testID="workout-loading">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.moss} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !workout) {
    return (
      <SafeAreaView style={styles.safe} testID="workout-error">
        <View style={styles.centered}>
          <Heading variant="h3">Couldn't load today's workout.</Heading>
          <BodyText tone="slate" style={styles.centeredBody}>
            {error}
          </BodyText>
          <Button
            label="Back"
            variant="secondary"
            iconLeft="arrow-left"
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: restSeconds !== null ? 220 : 140 },
        ]}
        showsVerticalScrollIndicator={false}
        testID="workout-today-root"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.backRow}>
            <Button
              label="Back"
              variant="secondary"
              iconLeft="arrow-left"
              fullWidth={false}
              onPress={() => router.back()}
              testID="workout-back"
              style={styles.backBtn}
            />
          </View>
          <BodyText variant="label" tone="slate">
            Today's session
          </BodyText>
          <Heading
            variant="h1"
            tone="bone"
            style={styles.name}
            testID="workout-title"
          >
            {workout.workout_name}
          </Heading>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <LineIcon name="list" size={14} tone="slate" />
              <Numeric variant="sm" tone="slate">
                {workout.exercises.length}
              </Numeric>
              <BodyText variant="caption" tone="slate">
                exercises
              </BodyText>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <LineIcon name="clock" size={14} tone="slate" />
              <Numeric variant="sm" tone="slate">
                {workout.duration_min}
              </Numeric>
              <BodyText variant="caption" tone="slate">
                min
              </BodyText>
            </View>
          </View>
        </View>

        {/* Exercise list */}
        <View style={styles.list} testID="exercise-list">
          {exercises.map((e, i) => (
            <ExerciseRow
              key={e.detail.id}
              name={e.detail.name}
              targetSets={e.detail.target_sets}
              targetReps={e.detail.target_reps}
              weightUnit={workout.weight_unit}
              weightStep={workout.weight_unit === 'kg' ? 2.5 : 5}
              lastLog={e.detail.last_log}
              sets={e.sets}
              expanded={e.expanded}
              onToggle={() => toggleExercise(i)}
              onSetChange={(si, patch) => patchSet(i, si, patch)}
              onSetComplete={(si) => completeSet(i, si)}
              onAddSet={() => addSet(i)}
              testID={`exercise-${i}`}
            />
          ))}
        </View>

        {/* Finish */}
        <View style={styles.finishSection}>
          <View style={styles.totalsRow}>
            <View>
              <BodyText variant="caption" tone="slate">
                Sets completed
              </BodyText>
              <Numeric variant="lg" tone="bone" testID="workout-total-sets">
                {totals.completed}
              </Numeric>
            </View>
            <View style={styles.totalsRight}>
              <BodyText variant="caption" tone="slate">
                Volume ({workout.weight_unit})
              </BodyText>
              <Numeric
                variant="lg"
                tone="bone"
                testID="workout-total-volume"
              >
                {totals.volume.toLocaleString()}
              </Numeric>
            </View>
          </View>
          <Button
            label={saving ? 'Saving…' : 'Finish workout'}
            iconRight="check"
            disabled={saving || totals.completed === 0}
            onPress={finish}
            testID="workout-finish"
          />
          {error ? (
            <BodyText tone="brass" style={styles.error}>
              {error}
            </BodyText>
          ) : null}
        </View>
      </ScrollView>

      {/* Rest timer overlay */}
      {restSeconds !== null ? (
        <RestTimer
          key={restKey}
          seconds={restSeconds}
          onDone={() => setRestSeconds(null)}
          onSkip={() => setRestSeconds(null)}
          testID="rest-timer"
        />
      ) : null}
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
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  backRow: {
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  backBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
  },
  name: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.hairlineOnInk,
  },
  finishSection: {
    marginTop: spacing.xl,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineOnInk,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineOnInk,
  },
  totalsRight: {
    alignItems: 'flex-end',
  },
  error: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  centeredBody: {
    marginBottom: spacing.lg,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
