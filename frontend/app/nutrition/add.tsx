/**
 * VYRO — Add food screen.
 *
 * Route: /nutrition/add?meal_type=lunch
 * Sticky search field at top, then a "Recent & favorites" section, then
 * live search results. Tap a food row → QuantitySheet slides up with a
 * servings stepper + live macro preview + meal-type selector + Confirm.
 *
 * Optimized for speed: search is debounced 220ms, results are paged out at
 * 30, recents surface by default so a returning user usually logs in 2 taps.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BodyText,
  FoodRow,
  FoodRowData,
  Heading,
  LineIcon,
  MealType,
  QuantitySheet,
  QuantitySheetFood,
  SearchField,
} from '@/src/components';
import { colors, spacing } from '@/src/theme';
import { storage } from '@/src/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const PROFILE_ID_KEY = 'vyro.profile.id';

const DEFAULT_MEAL_BY_HOUR = (h: number): MealType => {
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
};

interface Food extends QuantitySheetFood {}

interface Recent {
  food: Food;
  log_count: number;
}

export default function AddFood() {
  const router = useRouter();
  const params = useLocalSearchParams<{ meal_type?: string }>();
  const paramMealType =
    typeof params.meal_type === 'string' &&
    ['breakfast', 'lunch', 'dinner', 'snack'].includes(params.meal_type)
      ? (params.meal_type as MealType)
      : undefined;

  const [profileId, setProfileId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [searching, setSearching] = useState(false);

  // Quantity sheet state
  const [selected, setSelected] = useState<Food | null>(null);
  const [servings, setServings] = useState(1);
  const [mealType, setMealType] = useState<MealType>(
    paramMealType || DEFAULT_MEAL_BY_HOUR(new Date().getHours())
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load profile id + initial data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await storage.getItem<string>(PROFILE_ID_KEY, '');
      if (cancelled) return;
      if (!id) {
        setProfileId(null);
        return;
      }
      setProfileId(id);
      // Fetch recents + initial food list in parallel
      try {
        const [rRes, fRes] = await Promise.all([
          fetch(`${API_URL}/api/profiles/${id}/foods/recent`),
          fetch(`${API_URL}/api/foods?q=&limit=30`),
        ]);
        if (rRes.ok) {
          const rJson = await rRes.json();
          setRecents(rJson.recent || []);
        }
        if (fRes.ok) {
          const fJson = await fRes.json();
          setResults(fJson.results || []);
        }
      } catch {
        // silently ignore; the search will retry when the user types
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced search
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `${API_URL}/api/foods?q=${encodeURIComponent(query)}&limit=30`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setResults(json.results || []);
        }
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const onSelectFood = useCallback((food: Food) => {
    setSelected(food);
    setServings(1);
    setSaveError(null);
  }, []);

  const dismissSheet = useCallback(() => {
    setSelected(null);
    setServings(1);
  }, []);

  const onConfirm = useCallback(async () => {
    if (!profileId || !selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/profiles/${profileId}/meals`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            food_id: selected.id,
            meal_type: mealType,
            servings,
          }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Refresh recents so a subsequent tap in the same session surfaces it
      try {
        const r = await fetch(
          `${API_URL}/api/profiles/${profileId}/foods/recent`
        );
        if (r.ok) {
          const j = await r.json();
          setRecents(j.recent || []);
        }
      } catch {
        /* non-fatal */
      }
      setSelected(null);
      // Back to /nutrition — the focus effect there re-fetches groups. If
      // this screen was opened directly (no history), replace instead.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/nutrition');
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }, [profileId, selected, mealType, servings, router]);

  const recentAsRows: FoodRowData[] = useMemo(
    () =>
      recents.map((r) => ({
        id: r.food.id,
        name: r.food.name,
        portion: r.food.portion,
        calories: r.food.calories,
      })),
    [recents]
  );

  const showRecents = query.trim().length === 0 && recentAsRows.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Sticky header + search */}
      <View style={styles.stickyHeader}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/nutrition');
            }}
            hitSlop={12}
            testID="add-back"
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <LineIcon name="arrow-left" size={22} tone="bone" />
          </Pressable>
          <Heading variant="h3" tone="bone" style={styles.title}>
            Add food
          </Heading>
          <View style={styles.backBtn} />
        </View>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search food…"
          autoFocus
          testID="add-search"
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID="add-root"
      >
        {/* Recent & favorites — only when query is empty */}
        {showRecents ? (
          <View style={styles.section} testID="recent-section">
            <BodyText variant="label" tone="slate" style={styles.sectionLabel}>
              Recent & favorites
            </BodyText>
            <View style={styles.list}>
              {recentAsRows.map((f) => (
                <FoodRow
                  key={`r-${f.id}`}
                  food={f}
                  onPress={() => {
                    const original = recents.find((r) => r.food.id === f.id)?.food;
                    if (original) onSelectFood(original);
                  }}
                  testID={`recent-food-${f.id}`}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Results / all foods */}
        <View style={styles.section}>
          <View style={styles.resultsHeaderRow}>
            <BodyText variant="label" tone="slate">
              {query.trim() ? 'Matches' : 'All foods'}
            </BodyText>
            {searching ? (
              <ActivityIndicator size="small" color={colors.slate} />
            ) : null}
          </View>
          <View style={styles.list}>
            {results.length === 0 && !searching ? (
              <BodyText
                variant="caption"
                tone="slate"
                style={styles.emptyResults}
                testID="results-empty"
              >
                No foods match "{query}".
              </BodyText>
            ) : (
              results.map((f) => (
                <FoodRow
                  key={f.id}
                  food={{
                    id: f.id,
                    name: f.name,
                    portion: f.portion,
                    calories: f.calories,
                  }}
                  onPress={() => onSelectFood(f)}
                  testID={`food-${f.id}`}
                />
              ))
            )}
          </View>
        </View>

        {saveError ? (
          <BodyText tone="brass" style={styles.saveError} testID="add-error">
            {saveError}
          </BodyText>
        ) : null}
      </ScrollView>

      <QuantitySheet
        visible={selected !== null}
        food={selected}
        servings={servings}
        mealType={mealType}
        onChangeServings={setServings}
        onChangeMealType={setMealType}
        onConfirm={onConfirm}
        onDismiss={dismissSheet}
        saving={saving}
        testID="quantity-sheet"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  stickyHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineOnInk,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
  title: {
    // centered visually via the empty spacer on the right
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.hairlineOnInk,
  },
  emptyResults: {
    padding: spacing.lg,
    textAlign: 'center',
  },
  saveError: {
    padding: spacing.lg,
    textAlign: 'center',
  },
});
