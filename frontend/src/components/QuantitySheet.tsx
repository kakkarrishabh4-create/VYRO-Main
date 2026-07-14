/**
 * VYRO — QuantitySheet
 *
 * Inline bottom sheet for confirming a food entry: servings stepper, live
 * macro preview, meal-type segmented control, Confirm. Backdrops the whole
 * screen so the tap target is always the sheet itself.
 */

import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../theme';

import { Button } from './Button';
import { LineIcon } from './LineIcon';
import { NumberStepper } from './NumberStepper';
import { BodyText, Heading, Numeric } from './Typography';

export interface QuantitySheetFood {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface QuantitySheetProps {
  visible: boolean;
  food: QuantitySheetFood | null;
  servings: number;
  mealType: MealType;
  onChangeServings: (v: number) => void;
  onChangeMealType: (v: MealType) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  saving?: boolean;
  testID?: string;
}

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

export const QuantitySheet: React.FC<QuantitySheetProps> = ({
  visible,
  food,
  servings,
  mealType,
  onChangeServings,
  onChangeMealType,
  onConfirm,
  onDismiss,
  saving = false,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  if (!food) return null;

  const kcal = Math.round(food.calories * servings);
  const p = Math.round(food.protein_g * servings * 10) / 10;
  const c = Math.round(food.carbs_g * servings * 10) / 10;
  const fat = Math.round(food.fat_g * servings * 10) / 10;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onDismiss} />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          testID={testID}
        >
          {/* header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <BodyText variant="label" tone="slate">
                Log · {food.portion}
              </BodyText>
              <Heading variant="h3" tone="bone" style={styles.foodName}>
                {food.name}
              </Heading>
            </View>
            <Pressable
              onPress={onDismiss}
              hitSlop={8}
              testID={`${testID}-close`}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <LineIcon name="x" size={20} tone="slate" />
            </Pressable>
          </View>

          {/* servings */}
          <View style={styles.section}>
            <BodyText variant="caption" tone="slate" style={styles.label}>
              Servings
            </BodyText>
            <NumberStepper
              value={servings}
              onChange={onChangeServings}
              step={0.5}
              min={0.25}
              max={20}
              testID={`${testID}-servings`}
            />
          </View>

          {/* live macro preview */}
          <View style={styles.previewRow}>
            <PreviewCell label="kcal" value={kcal} tone="bone" testID={`${testID}-preview-kcal`} />
            <View style={styles.previewDivider} />
            <PreviewCell label="P" value={p} tone="slate" suffix="g" testID={`${testID}-preview-p`} />
            <PreviewCell label="C" value={c} tone="slate" suffix="g" testID={`${testID}-preview-c`} />
            <PreviewCell label="F" value={fat} tone="slate" suffix="g" testID={`${testID}-preview-f`} />
          </View>

          {/* meal type */}
          <View style={styles.section}>
            <BodyText variant="caption" tone="slate" style={styles.label}>
              Meal
            </BodyText>
            <View style={styles.mealRow}>
              {MEAL_TYPES.map((m) => {
                const selected = mealType === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => onChangeMealType(m.key)}
                    testID={`${testID}-meal-${m.key}`}
                    style={[styles.mealPill, selected && styles.mealPillSelected]}
                  >
                    <BodyText
                      variant="bodySmall"
                      tone={selected ? 'bone' : 'slate'}
                    >
                      {m.label}
                    </BodyText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Button
            label={saving ? 'Adding…' : 'Add to log'}
            iconRight="check"
            onPress={onConfirm}
            disabled={saving}
            testID={`${testID}-confirm`}
          />
        </View>
      </View>
    </Modal>
  );
};

// ---------- Preview cell ----------

const PreviewCell: React.FC<{
  label: string;
  value: number;
  tone: 'bone' | 'slate';
  suffix?: string;
  testID?: string;
}> = ({ label, value, tone, suffix, testID }) => (
  <View style={styles.previewCell} testID={testID}>
    <BodyText variant="caption" tone="slate">
      {label}
    </BodyText>
    <View style={styles.previewNums}>
      <Numeric variant="md" tone={tone}>
        {value}
      </Numeric>
      {suffix ? (
        <BodyText variant="caption" tone="slate">
          {suffix}
        </BodyText>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.ink,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.hairlineOnInk,
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  foodName: {
    marginTop: spacing.xs,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
  section: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairlineOnInk,
    marginBottom: spacing.md,
  },
  previewCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  previewNums: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  previewDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.hairlineOnInk,
    marginHorizontal: spacing.sm,
  },
  mealRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  mealPill: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairlineOnInk,
    backgroundColor: colors.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealPillSelected: {
    borderColor: colors.moss,
    backgroundColor: colors.moss,
  },
});
