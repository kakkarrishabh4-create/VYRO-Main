/**
 * VYRO — Post-onboarding landing.
 *
 * Minimal for now — proves the profile was created. Real dashboard, thread
 * timeline, coach chat etc. all land here in future iterations.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyText, Button, Heading, LineIcon } from '@/src/components';
import { colors, spacing } from '@/src/theme';

export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const firstName =
    typeof params.name === 'string' && params.name.length > 0
      ? params.name.split(' ')[0]
      : 'friend';

  return (
    <SafeAreaView style={styles.safe} testID="home-root">
      <View style={styles.container}>
        <View style={styles.top}>
          <LineIcon name="check" size={24} tone="moss" />
          <BodyText variant="label" tone="slate" style={styles.topLabel}>
            Profile created
          </BodyText>
        </View>
        <View style={styles.center}>
          <Heading variant="h1" tone="bone">
            Welcome, {firstName}.
          </Heading>
          <BodyText tone="slate" style={styles.tag}>
            Your plan is saved. Log your first session when you're ready — the
            thread starts today.
          </BodyText>
        </View>
        <View style={styles.bottom}>
          <Button
            label="Back to start"
            variant="secondary"
            iconLeft="arrow-left"
            testID="home-back"
            onPress={() => router.replace('/')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topLabel: {},
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  tag: {
    marginTop: spacing.md,
  },
  bottom: {},
});
