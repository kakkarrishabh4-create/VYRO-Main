/**
 * VYRO — Welcome / entry.
 *
 * Two paths:
 *  • First launch → Onboarding
 *  • Returning client (profile id in storage) → Home
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BodyText,
  Button,
  Heading,
} from '@/src/components';
import { colors, spacing } from '@/src/theme';
import { storage } from '@/src/utils/storage';

const PROFILE_ID_KEY = 'vyro.profile.id';

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await storage.getItem<string>(PROFILE_ID_KEY, '');
      if (cancelled) return;
      if (existing && existing.length > 0) {
        router.replace({
          pathname: '/home',
          params: { profileId: existing },
        });
        return;
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <SafeAreaView style={styles.safe} testID="welcome-checking">
        <View style={styles.center}>
          <ActivityIndicator color={colors.moss} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} testID="welcome-root">
      <View style={styles.container}>
        <View style={styles.top}>
          <BodyText variant="label" tone="slate">
            VYRO
          </BodyText>
        </View>
        <View style={styles.centerCol}>
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
  top: {},
  centerCol: {
    flex: 1,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tag: {
    marginTop: spacing.md,
    maxWidth: 320,
  },
  bottom: {},
});
