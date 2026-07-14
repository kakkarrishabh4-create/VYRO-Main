/**
 * VYRO — Client home screen.
 *
 * Opens with today's plan front and center. Deliberately anti-dashboard —
 * a journal page, top to bottom:
 *   1. Greeting + today's date + streak badge (Brass, only if ≥3)
 *   2. Today's workout hero — the main thing on the page
 *   3. Compact horizontal nutrition summary
 *   4. Last-5-days thread (the signature element)
 *
 * Data source: GET /api/profiles/{id}/today. Profile id is persisted via
 * @/src/utils/storage on step-5 confirm and read back here.
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BodyText,
  Button,
  Heading,
  HistoryEntry,
  HistoryThread,
  NutritionBar,
  StreakBadge,
  WorkoutHero,
} from '@/src/components';
import { colors, spacing } from '@/src/theme';
import { storage } from '@/src/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const PROFILE_ID_KEY = 'vyro.profile.id';

interface TodayResponse {
  profile_id: string;
  name: string;
  today_date: string;
  today_workout: { name: string; exercises: number; duration_min: number };
  today_nutrition: {
    calories_consumed: number;
    calories_target: number;
    protein_consumed: number;
    protein_target: number;
    carbs_consumed: number;
    carbs_target: number;
    fat_consumed: number;
    fat_target: number;
  };
  streak: number;
  history: HistoryEntry[];
}

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const weekdays = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday',
  ];
  return `${weekdays[dt.getDay()]}, ${months[dt.getMonth()]} ${dt.getDate()}`;
};

export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams<{ profileId?: string; name?: string }>();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Resolve profile id: query param > storage > null (fall back to welcome)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromParam =
        typeof params.profileId === 'string' && params.profileId.length > 0
          ? params.profileId
          : null;
      const fromStore = fromParam
        ? null
        : await storage.getItem<string>(PROFILE_ID_KEY, '');
      if (cancelled) return;
      const resolved = fromParam || (fromStore ? fromStore : null);
      if (fromParam) await storage.setItem(PROFILE_ID_KEY, fromParam);
      setProfileId(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.profileId]);

  const load = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/profiles/${id}/today`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as TodayResponse;
        setData(json);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Could not load your day — try again.'
        );
      }
    },
    []
  );

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    load(profileId).finally(() => setLoading(false));
  }, [profileId, load]);

  // Re-load whenever this screen regains focus (e.g. after logging a meal).
  useFocusEffect(
    useCallback(() => {
      if (profileId) {
        load(profileId);
      }
    }, [profileId, load])
  );

  const onRefresh = useCallback(async () => {
    if (!profileId) return;
    setRefreshing(true);
    await load(profileId);
    setRefreshing(false);
  }, [profileId, load]);

  // ---------- Empty / loading / error states ----------
  if (!profileId) {
    return (
      <SafeAreaView style={styles.safe} testID="home-empty">
        <View style={styles.centered}>
          <Heading variant="h2" tone="bone" style={styles.errHeader}>
            No profile yet.
          </Heading>
          <BodyText tone="slate" style={styles.errBody}>
            Complete onboarding to see today's plan.
          </BodyText>
          <Button
            label="Start onboarding"
            iconRight="arrow-right"
            testID="home-start-onboarding"
            onPress={() => router.replace('/')}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} testID="home-loading">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.moss} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safe} testID="home-error">
        <View style={styles.centered}>
          <Heading variant="h3" tone="bone" style={styles.errHeader}>
            Couldn't load today.
          </Heading>
          <BodyText tone="slate" style={styles.errBody}>
            {error}
          </BodyText>
          <Button
            label="Retry"
            iconLeft="refresh-cw"
            testID="home-retry"
            onPress={() => profileId && load(profileId)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const firstName =
    (params.name && typeof params.name === 'string'
      ? params.name
      : data.name
    ).split(' ')[0] || 'friend';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.moss}
          />
        }
        testID="home-root"
      >
        {/* 1. Greeting */}
        <View style={styles.greetingRow} testID="home-greeting">
          <View style={styles.greetingCol}>
            <BodyText variant="label" tone="slate">
              {formatDate(data.today_date)}
            </BodyText>
            <Heading variant="h1" tone="bone" style={styles.hello}>
              Morning, {firstName}.
            </Heading>
          </View>
          <StreakBadge days={data.streak} testID="home-streak" />
        </View>

        {/* 2. Today's workout hero */}
        <View style={styles.section}>
          <WorkoutHero
            name={data.today_workout.name}
            exercises={data.today_workout.exercises}
            durationMin={data.today_workout.duration_min}
            onStart={() =>
              router.push({
                pathname: '/workout/today',
                params: {
                  name: data.today_workout.name,
                  exercises: String(data.today_workout.exercises),
                  duration: String(data.today_workout.duration_min),
                },
              })
            }
            testID="home-workout"
          />
        </View>

        {/* 3. Nutrition */}
        <View style={styles.section}>
          <Pressable
            onPress={() => router.push('/nutrition')}
            testID="home-nutrition-pressable"
            style={({ pressed }) => (pressed ? styles.nutritionPressed : undefined)}
          >
            <NutritionBar
            caloriesConsumed={data.today_nutrition.calories_consumed}
            caloriesTarget={data.today_nutrition.calories_target}
            protein={{
              label: 'Protein',
              consumed: data.today_nutrition.protein_consumed,
              target: data.today_nutrition.protein_target,
            }}
            carbs={{
              label: 'Carbs',
              consumed: data.today_nutrition.carbs_consumed,
              target: data.today_nutrition.carbs_target,
            }}
            fat={{
              label: 'Fat',
              consumed: data.today_nutrition.fat_consumed,
              target: data.today_nutrition.fat_target,
            }}
            testID="home-nutrition"
          />
          </Pressable>
        </View>

        {/* 4. Thread history */}
        <View style={styles.section}>
          <HistoryThread entries={data.history} testID="home-history" />
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
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greetingCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  hello: {
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errHeader: {
    marginBottom: spacing.sm,
  },
  errBody: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  nutritionPressed: {
    opacity: 0.7,
  },
});
