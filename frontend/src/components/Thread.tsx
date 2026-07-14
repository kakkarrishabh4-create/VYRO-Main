/**
 * VYRO — Thread
 *
 * The signature element: a thin vertical line that connects consecutive
 * logged entries (workouts, meals) on any history/timeline view. It
 * represents consistency over time — the coaching relationship visualized.
 *
 * Two building blocks:
 *  • <Thread>       → the container that draws the vertical line and
 *                     positions its children (ThreadEntry) along it.
 *  • <ThreadEntry>  → a single journal entry with a 6px dot marker on the
 *                     thread.
 *
 * Example:
 *   <Thread>
 *     <ThreadEntry>...workout row...</ThreadEntry>
 *     <ThreadEntry>...meal row...</ThreadEntry>
 *   </Thread>
 */

import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { colors, spacing, thread } from '../theme';

type Surface = 'ink' | 'bone';

export interface ThreadProps extends ViewProps {
  surface?: Surface;
}

export const Thread: React.FC<ThreadProps> = ({
  surface = 'ink',
  style,
  children,
  ...rest
}) => {
  const lineColor = surface === 'ink' ? colors.threadOnInk : colors.threadOnBone;
  return (
    <View {...rest} style={[styles.container, style]}>
      {/* The thread itself */}
      <View
        style={[
          styles.line,
          {
            backgroundColor: lineColor,
            width: thread.width,
            left: thread.leftInset,
          },
        ]}
      />
      {children}
    </View>
  );
};

export interface ThreadEntryProps extends ViewProps {
  surface?: Surface;
  isFirst?: boolean;
  isLast?: boolean;
}

export const ThreadEntry: React.FC<ThreadEntryProps> = ({
  surface = 'ink',
  style,
  children,
  ...rest
}) => {
  const dotColor = surface === 'ink' ? colors.moss : colors.slate;
  return (
    <View {...rest} style={[styles.entry, style]}>
      <View
        style={[
          styles.dot,
          {
            backgroundColor: dotColor,
            left: thread.leftInset - thread.dotSize / 2 + thread.width / 2,
          },
        ]}
      />
      <View style={styles.entryContent}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  entry: {
    position: 'relative',
    paddingLeft: thread.leftInset + spacing.lg, // room past the thread
    paddingVertical: spacing.md,
  },
  entryContent: {
    // children just flow naturally; no forced grid
  },
  dot: {
    position: 'absolute',
    top: spacing.md + 8, // vertical-align roughly to first row of copy
    width: thread.dotSize,
    height: thread.dotSize,
    borderRadius: thread.dotSize / 2,
  },
});
