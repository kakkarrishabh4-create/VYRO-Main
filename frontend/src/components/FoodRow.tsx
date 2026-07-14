/**
 * VYRO — FoodRow
 *
 * Single row in the Add-food search results / recents list. Text-forward:
 * name in Inter medium, portion in Slate, calories on the right in Plex
 * Mono. Whole row is one tap target — no separate chevron.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';

import { BodyText, Numeric } from './Typography';

export interface FoodRowData {
  id: string;
  name: string;
  portion: string;
  calories: number;
}

interface FoodRowProps {
  food: FoodRowData;
  onPress: () => void;
  testID?: string;
}

export const FoodRow: React.FC<FoodRowProps> = ({ food, onPress, testID }) => {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <BodyText variant="bodyMedium" tone="bone" numberOfLines={1}>
          {food.name}
        </BodyText>
        <BodyText
          variant="caption"
          tone="slate"
          style={styles.portion}
          numberOfLines={1}
        >
          {food.portion}
        </BodyText>
      </View>
      <View style={styles.right}>
        <Numeric variant="md" tone="bone">
          {Math.round(food.calories)}
        </Numeric>
        <BodyText variant="caption" tone="slate">
          kcal
        </BodyText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineOnInk,
  },
  pressed: {
    backgroundColor: colors.inkSoft,
  },
  left: {
    flex: 1,
    paddingRight: spacing.md,
  },
  portion: {
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
});
