/**
 * VYRO — TextField
 *
 * Inter body input, hairline border, focus in Moss. Supports optional
 * suffix (unit label) and monospace numeric mode for weight/height/age.
 */

import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { colors, fontFamily, radius, spacing } from '../theme';

import { BodyText } from './Typography';

export interface TextFieldProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  numeric?: boolean;
  suffix?: string;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  autoFocus?: boolean;
  testID?: string;
  style?: ViewStyle;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  numeric = false,
  suffix,
  multiline = false,
  numberOfLines,
  maxLength,
  autoFocus,
  testID,
  style,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <BodyText variant="label" tone="slate" style={styles.label}>
          {label}
        </BodyText>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          focused && styles.fieldFocused,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.slate}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          testID={testID}
          style={[
            styles.input,
            {
              fontFamily: numeric
                ? fontFamily.numericRegular
                : fontFamily.bodyRegular,
            },
            multiline && styles.inputMultiline,
          ]}
        />
        {suffix ? (
          <BodyText variant="bodySmall" tone="slate" style={styles.suffix}>
            {suffix}
          </BodyText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    // container
  },
  label: {
    marginBottom: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairlineOnInk,
    borderRadius: radius.md,
    backgroundColor: colors.inkSoft,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  multiline: {
    height: 'auto',
    minHeight: 96,
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
  },
  fieldFocused: {
    borderColor: colors.moss,
  },
  input: {
    flex: 1,
    color: colors.bone,
    fontSize: 16,
    padding: 0,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  suffix: {
    marginLeft: spacing.sm,
  },
});
