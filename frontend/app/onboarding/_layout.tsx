import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingProvider } from '@/src/context/OnboardingContext';
import { colors, spacing } from '@/src/theme';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.ink },
              animation: 'slide_from_right',
            }}
          />
        </View>
      </SafeAreaView>
    </OnboardingProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  container: {
    flex: 1,
    paddingTop: spacing.sm,
  },
});
