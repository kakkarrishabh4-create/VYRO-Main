/**
 * VYRO — OptionCard
 *
 * A large tappable selection tile — the brief says "large tappable options
 * over dropdowns where possible". Selected state changes color/border ONLY
 * (never size), consistent with the design system rules.
 */

import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme';

import { LineIcon } from './LineIcon';
import { BodyText } from './Typography';

export interface OptionCardProps {
  title: string;
  description?: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
  style?: ViewStyle;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  title,
  description,
  selected = false,
  onPress,
  testID,
  style,
}) => {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
        style,
      ]}
    >
      <View style={styles.textCol}>
        <BodyText variant="bodyMedium" tone="bone">
          {title}
        </BodyText>
        {description ? (
          <BodyText variant="caption" tone="slate" style={styles.desc}>
            {description}
          </BodyText>
        ) : null}
      </View>
      {selected ? (
        <LineIcon name="check" size={20} tone="moss" testID={`${testID}-check`} />
      ) : (
        <View style={styles.checkPlaceholder} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.hairlineOnInk,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.inkSoft,
    minHeight: 64,
  },
  selected: {
    borderColor: colors.moss,
    backgroundColor: '#1E2521', // subtle Moss-tinted surface
  },
  pressed: {
    opacity: 0.75,
  },
  textCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  desc: {
    marginTop: 2,
  },
  checkPlaceholder: {
    width: 20,
    height: 20,
  },
});
