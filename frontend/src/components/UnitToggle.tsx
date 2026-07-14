/**
 * VYRO — UnitToggle
 *
 * Two-value segmented control (e.g. kg / lb). Uses color-only selection —
 * no size or weight change per the design rules.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme';

import { BodyText } from './Typography';

interface UnitToggleProps<T extends string> {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  testID?: string;
}

export function UnitToggle<T extends string>({
  value,
  options,
  onChange,
  testID,
}: UnitToggleProps<T>) {
  return (
    <View style={styles.wrap} testID={testID}>
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            testID={`${testID}-${opt}`}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <BodyText
              variant="bodySmall"
              tone={selected ? 'bone' : 'slate'}
              style={styles.segmentText}
            >
              {opt}
            </BodyText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.hairlineOnInk,
    borderRadius: radius.md,
    padding: 3,
    alignSelf: 'flex-start',
    backgroundColor: colors.inkSoft,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.moss,
  },
  segmentText: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
