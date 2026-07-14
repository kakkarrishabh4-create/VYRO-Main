/**
 * VYRO — RestTimer
 *
 * Bottom overlay countdown that appears automatically after logging a set.
 * Understated — a single row with the remaining time in IBM Plex Mono,
 * a "+15s" adjuster, and a "Skip" secondary. Sits above the tab bar area
 * with insets.bottom so it never overlaps home indicators.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../theme';

import { LineIcon } from './LineIcon';
import { BodyText, Numeric } from './Typography';

interface RestTimerProps {
  seconds: number;
  onDone: () => void;
  onSkip?: () => void;
  testID?: string;
}

const formatClock = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const RestTimer: React.FC<RestTimerProps> = ({
  seconds,
  onDone,
  onSkip,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(seconds);
  const doneCalledRef = useRef(false);

  // Reset whenever a new timer is mounted with a fresh seconds value.
  useEffect(() => {
    setRemaining(seconds);
    doneCalledRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      if (!doneCalledRef.current) {
        doneCalledRef.current = true;
        onDone();
      }
      return;
    }
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining, onDone]);

  const handleAdd = () => setRemaining((r) => r + 15);
  const handleSkip = () => {
    doneCalledRef.current = true;
    if (onSkip) onSkip();
    else onDone();
  };

  return (
    <View
      testID={testID}
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.left}>
          <LineIcon name="clock" size={16} tone="bone" />
          <BodyText variant="label" tone="slate">
            Rest
          </BodyText>
          <Numeric variant="lg" tone="bone" testID={`${testID}-value`}>
            {formatClock(remaining)}
          </Numeric>
        </View>
        <View style={styles.right}>
          <Pressable
            onPress={handleAdd}
            testID={`${testID}-add`}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          >
            <BodyText variant="bodySmall" tone="bone">
              +15s
            </BodyText>
          </Pressable>
          <Pressable
            onPress={handleSkip}
            testID={`${testID}-skip`}
            style={({ pressed }) => [styles.btn, styles.skipBtn, pressed && styles.btnPressed]}
          >
            <BodyText variant="bodySmall" tone="bone">
              Skip
            </BodyText>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.inkSoft,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineOnInk,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  right: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairlineOnInk,
    minWidth: 60,
    alignItems: 'center',
  },
  btnPressed: {
    opacity: 0.6,
  },
  skipBtn: {
    borderColor: colors.moss,
  },
});
