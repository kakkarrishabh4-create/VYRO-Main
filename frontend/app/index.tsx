/**
 * VYRO — Welcome / entry.
 *
 * Not a full landing — just enough to send new clients into the onboarding
 * flow. Once real screens (dashboard, timeline, coach chat) are built,
 * this file will branch: existing profile → /home, no profile → /onboarding.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BodyText,
  Button,
  Heading,
} from '@/src/components';
import { colors, spacing } from '@/src/theme';

export default function Index() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} testID="welcome-root">
      <View style={styles.container}>
        <View style={styles.top}>
          <BodyText variant="label" tone="slate">
            VYRO
          </BodyText>
        </View>
        <View style={styles.center}>
          <Heading variant="display" tone="bone">
            Kept, not{'\n'}crammed.
          </Heading>
          <BodyText tone="slate" style={styles.tag}>
            A quiet journal for the work between sessions — training, food,
            recovery.
          </BodyText>
        </View>
        <View style={styles.bottom}>
          <Button
            label="Start my onboarding"
            iconRight="arrow-right"
            testID="welcome-start"
            onPress={() => router.push('/onboarding')}
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
    // header
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  tag: {
    marginTop: spacing.md,
    maxWidth: 320,
  },
  bottom: {
    // footer button
  },
});
