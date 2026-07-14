/**
 * VYRO — StepHeader
 *
 * Persistent Back arrow (per the brief), Fraunces headline, Inter subhead.
 * Sits directly under the ProgressIndicator on every onboarding step.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { spacing } from '../theme';

import { LineIcon } from './LineIcon';
import { BodyText, Heading } from './Typography';

interface StepHeaderProps {
  headline: string;
  subhead?: string;
  onBack?: () => void;
  showBack?: boolean;
  testID?: string;
}

export const StepHeader: React.FC<StepHeaderProps> = ({
  headline,
  subhead,
  onBack,
  showBack = true,
  testID,
}) => {
  const router = useRouter();
  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            testID="step-back-button"
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          >
            <LineIcon name="arrow-left" size={22} tone="bone" />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
      </View>
      <Heading variant="h1" style={styles.headline}>
        {headline}
      </Heading>
      {subhead ? (
        <BodyText tone="slate" style={styles.subhead}>
          {subhead}
        </BodyText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    // container
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.5,
  },
  headline: {
    marginBottom: spacing.sm,
  },
  subhead: {
    marginBottom: spacing.md,
  },
});
