/**
 * VYRO — Nutrition tracking screen.
 *
 * Route: /nutrition
 * Top: daily summary bar (calories + macros, thin Moss progress, Plex Mono).
 * Below: today's meals grouped by Breakfast / Lunch / Dinner / Snacks,
 * each as a journal-style thread of entries.
 *
 * Text-forward, one-handed. Each meal section has its own inline "Add" so
 * repeat logging goes straight into the right slot with 2 taps.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
  LineIcon,
  MealSection,
  MealEntryData,
  MealType,
  NutritionBar,
} from '@/src/components';
import { colors, spacing } from '@/src/theme';
import { storage } from '@/src/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const PROFILE_ID_KEY = 'vyro.profile.id';

interface MealGroup {
  meal_type: MealType;
  entries: MealEntryData[];
  subtotal_calories: number;
  subtotal_protein: number;
  subtotal_carbs: number;
  subtotal_fat: number;
}

interface NutritionToday {
  profile_id: string;
  date: string;
  nutrition: {
    calories_consumed: number;
    calories_target: number;
    protein_consumed: number;
    protein_target: number;
    carbs_consumed: number;
    carbs_target: number;
    fat_consumed: number;
    fat_target: number;
  };
  meals: MealGroup[];
}

export default function Nutrition() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [data, setData] = useState<NutritionToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/profiles/${id}/nutrition/today`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as NutritionToday;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load nutrition.');
    }
  }, []);

  // Re-fetch every time this screen gains focus (so newly-logged entries
  // from /nutrition/add appear when we come back).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const id = await storage.getItem<string>(PROFILE_ID_KEY, '');
        if (cancelled) return;
        if (!id) {
          setProfileId(null);
          setLoading(false);
          return;
        }
        setProfileId(id);
        await load(id);
        if (!cancelled) setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    if (!profileId) return;
    setRefreshing(true);
    await load(profileId);
    setRefreshing(false);
  }, [profileId, load]);

  const openAdd = useCallback(
    (mealType?: MealType) => {
      router.push({
        pathname: '/nutrition/add',
        params: mealType ? { meal_type: mealType } : {},
      });
    },
    [router]
  );

  // ---------- states ----------
  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} testID="nutrition-loading">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.moss} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profileId) {
    return (
      <SafeAreaView style={styles.safe} testID="nutrition-empty">
        <View style={styles.centered}>
          <Heading variant="h3">No profile yet.</Heading>
          <BodyText tone="slate" style={styles.centeredBody}>
            Finish onboarding first.
          </BodyText>
          <Button
            label="Go to onboarding"
            onPress={() => router.replace('/')}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safe} testID="nutrition-error">
        <View style={styles.centered}>
          <Heading variant="h3">Couldn't load today's fuel.</Heading>
          <BodyText tone="slate" style={styles.centeredBody}>
            {error}
          </BodyText>
          <Button
            label="Retry"
            iconLeft="refresh-cw"
            onPress={() => profileId && load(profileId)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

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
        testID="nutrition-root"
      >
        {/* Header with back */}
        <View style={styles.headerRow}>
          <Button
            label="Back"
            variant="secondary"
            iconLeft="arrow-left"
            fullWidth={false}
            style={styles.backBtn}
            onPress={() => router.back()}
            testID="nutrition-back"
          />
          <Button
            label="Add food"
            variant="secondary"
            iconLeft="plus"
            fullWidth={false}
            style={styles.addTopBtn}
            onPress={() => openAdd()}
            testID="nutrition-add-top"
          />
        </View>

        <View style={styles.title}>
          <BodyText variant="label" tone="slate">
            Today
          </BodyText>
          <Heading variant="h1" tone="bone" style={styles.headline}>
            Nutrition
          </Heading>
        </View>

        {/* 1. Summary bar */}
        <View style={styles.summary}>
          <NutritionBar
            caloriesConsumed={data.nutrition.calories_consumed}
            caloriesTarget={data.nutrition.calories_target}
            protein={{
              label: 'Protein',
              consumed: data.nutrition.protein_consumed,
              target: data.nutrition.protein_target,
            }}
            carbs={{
              label: 'Carbs',
              consumed: data.nutrition.carbs_consumed,
              target: data.nutrition.carbs_target,
            }}
            fat={{
              label: 'Fat',
              consumed: data.nutrition.fat_consumed,
              target: data.nutrition.fat_target,
            }}
            testID="nutrition-summary"
          />
        </View>

        {/* 2. Meal groups */}
        <View style={styles.meals}>
          {data.meals.map((m) => (
            <MealSection
              key={m.meal_type}
              meal_type={m.meal_type}
              entries={m.entries}
              subtotal_calories={m.subtotal_calories}
              onAdd={() => openAdd(m.meal_type)}
              testID={`meal-${m.meal_type}`}
            />
          ))}
        </View>

        {/* Footer note */}
        <View style={styles.footer}>
          <LineIcon name="edit-3" size={14} tone="slate" />
          <BodyText variant="caption" tone="slate">
            Long-press an entry to remove it.
          </BodyText>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
  },
  addTopBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
  },
  title: {
    marginBottom: spacing.lg,
  },
  headline: {
    marginTop: spacing.xs,
  },
  summary: {
    marginBottom: spacing.xl,
  },
  meals: {
    // MealSection handles its own margins
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingLeft: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  centeredBody: {
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
