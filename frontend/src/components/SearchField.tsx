/**
 * VYRO — SearchField
 *
 * Sticky search input for the Add-food screen. Cheaper than reusing
 * TextField because we want a shorter (44pt) row with a leading icon, a
 * clear (x) affordance, and no floating label.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { colors, fontFamily, radius, spacing } from '../theme';

import { LineIcon } from './LineIcon';

interface SearchFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  testID?: string;
  onSubmit?: () => void;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeText,
  placeholder = 'Search food…',
  autoFocus,
  testID,
  onSubmit,
}) => {
  return (
    <View style={styles.wrap}>
      <LineIcon name="search" size={16} tone="slate" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.slate}
        autoFocus={autoFocus}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        onSubmitEditing={onSubmit}
        testID={testID}
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          testID={`${testID}-clear`}
          style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
        >
          <LineIcon name="x" size={16} tone="slate" />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairlineOnInk,
    borderRadius: radius.md,
    backgroundColor: colors.inkSoft,
    paddingHorizontal: spacing.md,
    height: 46,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.bone,
    fontFamily: fontFamily.bodyRegular,
    fontSize: 15,
    padding: 0,
  },
  clear: {
    padding: 4,
  },
  clearPressed: {
    opacity: 0.5,
  },
});
