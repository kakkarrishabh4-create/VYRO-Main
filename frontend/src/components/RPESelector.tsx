/**
 * VYRO — RPESelector
 *
 * 10-dot row for Rate of Perceived Exertion. Selection is color/border-only
 * change per the design rules (no size shift). Optional — sets can be
 * completed with a null RPE.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';

import { BodyText, Numeric } from './Typography';

interface RPESelectorProps {
  value: number | null;
  onChange: (v: number | null) => void;
  testID?: string;
}

const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const RPESelector: React.FC<RPESelectorProps> = ({
  value,
  onChange,
  testID,
}) => {
  return (
    <View style={styles.wrap} testID={testID}>
      <BodyText variant="caption" tone="slate" style={styles.label}>
        RPE
      </BodyText>
      <View style={styles.row}>
        {VALUES.map((v) => {
          const selected = value === v;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(selected ? null : v)}
              testID={`${testID}-${v}`}
              style={[styles.dot, selected && styles.dotSelected]}
              hitSlop={4}
            >
              <Numeric
                variant="sm"
                tone={selected ? 'bone' : 'slate'}
                style={styles.dotText}
              >
                {v}
              </Numeric>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const DOT = 26;

const styles = StyleSheet.create({
  wrap: {},
  label: {
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dot: {
    flex: 1,
    height: DOT,
    borderWidth: 1,
    borderColor: colors.hairlineOnInk,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inkSoft,
  },
  dotSelected: {
    borderColor: colors.moss,
    backgroundColor: '#1E2521',
  },
  dotText: {
    lineHeight: DOT - 4,
  },
});
