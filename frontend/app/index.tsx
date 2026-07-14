/**
 * VYRO — Theme verification placeholder.
 *
 * The brief says "do not build any screens yet — just establish this as the
 * design system/theme for the whole app". This file therefore does the
 * absolute minimum: renders a small quiet page that proves every part of the
 * design system (colors, three font families, buttons, cards, thread,
 * line-icons) is wired up correctly.
 *
 * Delete or replace this file once real screens start getting built. All
 * future screens should import from '@/src/theme' and '@/src/components'.
 */

import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BodyText,
  Button,
  Card,
  Heading,
  LineIcon,
  Numeric,
  Thread,
  ThreadEntry,
} from "@/src/components";
import { colors, spacing } from "@/src/theme";

export default function Index() {
  return (
    <SafeAreaView style={styles.safe} testID="vyro-theme-root">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Wordmark + brief */}
        <View style={styles.header} testID="vyro-header">
          <BodyText variant="label" tone="slate">
            VYRO · Design System
          </BodyText>
          <Heading variant="display" tone="bone" style={styles.wordmark}>
            Vyro.
          </Heading>
          <BodyText tone="slate">
            Personal training, kept like a journal.
          </BodyText>
        </View>

        {/* Type specimens */}
        <View style={styles.section}>
          <BodyText variant="label" tone="slate" style={styles.sectionLabel}>
            Type
          </BodyText>
          <Heading variant="h1">Fraunces — headings</Heading>
          <BodyText style={styles.gap}>
            Inter — body and UI labels. Quiet, disciplined, readable.
          </BodyText>
          <View style={styles.numericRow}>
            <Numeric variant="lg">185.0</Numeric>
            <BodyText variant="caption" tone="slate">
              lb
            </BodyText>
            <Numeric variant="lg" style={styles.numericGap}>
              8×5
            </Numeric>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.section}>
          <BodyText variant="label" tone="slate" style={styles.sectionLabel}>
            Buttons
          </BodyText>
          <Button
            label="Log today's session"
            testID="button-primary-demo"
            onPress={() => {}}
          />
          <View style={styles.gap}>
            <Button
              label="View history"
              variant="secondary"
              surface="ink"
              iconLeft="clock"
              testID="button-secondary-demo"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Card + numeric column alignment */}
        <View style={styles.section}>
          <BodyText variant="label" tone="slate" style={styles.sectionLabel}>
            Surface
          </BodyText>
          <Card surface="ink" testID="card-demo">
            <Heading variant="h3">This week</Heading>
            <BodyText tone="slate" style={styles.gap}>
              Three sessions logged. On pace.
            </BodyText>
            <View style={styles.metricsRow}>
              <View>
                <BodyText variant="caption" tone="slate">
                  Volume
                </BodyText>
                <Numeric variant="md" tone="bone">
                  24,150
                </Numeric>
              </View>
              <View>
                <BodyText variant="caption" tone="slate">
                  Calories
                </BodyText>
                <Numeric variant="md" tone="bone">
                  02,180
                </Numeric>
              </View>
              <View>
                <BodyText variant="caption" tone="slate">
                  Streak
                </BodyText>
                <Numeric variant="md" tone="brass">
                  12
                </Numeric>
              </View>
            </View>
          </Card>
        </View>

        {/* Thread signature element */}
        <View style={styles.section}>
          <BodyText variant="label" tone="slate" style={styles.sectionLabel}>
            Thread
          </BodyText>
          <Thread surface="ink" testID="thread-demo">
            <ThreadEntry>
              <BodyText variant="caption" tone="slate">
                MON · 06:12
              </BodyText>
              <Heading variant="h3" style={styles.entryTitle}>
                Push · Upper
              </Heading>
              <View style={styles.entryMetric}>
                <Numeric variant="md">4</Numeric>
                <BodyText variant="caption" tone="slate">
                  lifts
                </BodyText>
                <Numeric variant="md" style={styles.metricSpacer}>
                  38
                </Numeric>
                <BodyText variant="caption" tone="slate">
                  sets
                </BodyText>
              </View>
            </ThreadEntry>
            <ThreadEntry>
              <BodyText variant="caption" tone="slate">
                TUE · 12:40
              </BodyText>
              <Heading variant="h3" style={styles.entryTitle}>
                Meal · Lunch
              </Heading>
              <View style={styles.entryMetric}>
                <Numeric variant="md">642</Numeric>
                <BodyText variant="caption" tone="slate">
                  kcal
                </BodyText>
              </View>
            </ThreadEntry>
            <ThreadEntry>
              <BodyText variant="caption" tone="brass">
                WED · PR
              </BodyText>
              <Heading variant="h3" style={styles.entryTitle}>
                Deadlift · 405
              </Heading>
              <View style={styles.entryMetric}>
                <LineIcon name="award" size={16} tone="brass" />
                <BodyText variant="caption" tone="brass">
                  New personal record
                </BodyText>
              </View>
            </ThreadEntry>
          </Thread>
        </View>

        <View style={styles.footer}>
          <BodyText variant="caption" tone="slate">
            Theme foundation ready. No screens yet.
          </BodyText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  wordmark: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    marginBottom: spacing.md,
  },
  gap: {
    marginTop: spacing.md,
  },
  numericRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  numericGap: {
    marginLeft: spacing.lg,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  entryTitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  entryMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metricSpacer: {
    marginLeft: spacing.md,
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: "center",
  },
});
