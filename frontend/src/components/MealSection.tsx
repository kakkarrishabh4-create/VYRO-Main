/**
 * VYRO — MealSection
 *
 * A single meal-type block on the nutrition screen. Uses the signature
 * `<Thread>` with one `<ThreadEntry>` per logged food. Subtle inline "Add"
 * button per section — one-handed and fast, minimal chrome.
 *
 * Empty-state variant: no Thread at all, just a quiet "—" line and the Add
 * action, so the screen never feels like it's punishing an empty meal.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';

import { LineIcon } from './LineIcon';
import { Thread, ThreadEntry } from './Thread';
import { BodyText, Numeric } from './Typography';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntryData {
  id: string;
  food_name: string;
  portion: string;
  servings: number;
  calories: number;
}

interface MealSectionProps {
  meal_type: MealType;
  entries: MealEntryData[];
  subtotal_calories: number;
  onAdd: () => void;
  onEntryLongPress?: (entry: MealEntryData) => void;
  testID?: string;
}

const TITLES: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

const formatServings = (n: number): string => {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

export const MealSection: React.FC<MealSectionProps> = ({
  meal_type,
  entries,
  subtotal_calories,
  onAdd,
  onEntryLongPress,
  testID,
}) => {
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.headerRow}>
        <BodyText variant="label" tone="slate">
          {TITLES[meal_type]}
        </BodyText>
        {subtotal_calories > 0 ? (
          <View style={styles.subtotal}>
            <Numeric variant="sm" tone="slate">
              {subtotal_calories}
            </Numeric>
            <BodyText variant="caption" tone="slate">
              kcal
            </BodyText>
          </View>
        ) : null}
      </View>

      {entries.length > 0 ? (
        <Thread surface="ink" style={styles.thread}>
          {entries.map((e) => (
            <ThreadEntry
              key={e.id}
              surface="ink"
              testID={`${testID}-entry-${e.id}`}
            >
              <Pressable
                onLongPress={() => onEntryLongPress && onEntryLongPress(e)}
                delayLongPress={350}
              >
                <View style={styles.entryRow}>
                  <View style={styles.entryLeft}>
                    <BodyText variant="bodyMedium" tone="bone">
                      {e.food_name}
                    </BodyText>
                    <View style={styles.entryMeta}>
                      {e.servings !== 1 ? (
                        <>
                          <Numeric variant="sm" tone="slate">
                            {formatServings(e.servings)}
                          </Numeric>
                          <BodyText variant="caption" tone="slate">
                            ×
                          </BodyText>
                        </>
                      ) : null}
                      <BodyText variant="caption" tone="slate">
                        {e.portion}
                      </BodyText>
                    </View>
                  </View>
                  <View style={styles.entryRight}>
                    <Numeric variant="md" tone="bone">
                      {Math.round(e.calories)}
                    </Numeric>
                    <BodyText variant="caption" tone="slate">
                      kcal
                    </BodyText>
                  </View>
                </View>
              </Pressable>
            </ThreadEntry>
          ))}
        </Thread>
      ) : (
        <View style={styles.empty} testID={`${testID}-empty`}>
          <BodyText variant="caption" tone="slate">
            —
          </BodyText>
        </View>
      )}

      <Pressable
        onPress={onAdd}
        testID={`${testID}-add`}
        style={({ pressed }) => [styles.addBtn, pressed && styles.addPressed]}
        hitSlop={8}
      >
        <LineIcon name="plus" size={16} tone="moss" />
        <BodyText variant="bodySmall" tone="moss">
          Add
        </BodyText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  subtotal: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  thread: {
    // no styles — Thread manages its own line
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  empty: {
    paddingLeft: spacing.lg + 24,
    paddingVertical: spacing.sm,
  },
  addBtn: {
    marginLeft: 24,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  addPressed: {
    opacity: 0.5,
  },
});

// Preserve the SET of exposed titles for other files (used in Add screen).
export const MEAL_TITLES = TITLES;
