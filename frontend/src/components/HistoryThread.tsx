/**
 * VYRO — HistoryThread
 *
 * The signature vertical thread applied to the last N days of activity.
 * Deliberately understated — one compact line per day: date + status label
 * (or workout name). Missed days use Slate copy; workout days use Bone;
 * rest days use Slate but not marked as a break in the thread.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';

import { LineIcon } from './LineIcon';
import { Thread, ThreadEntry } from './Thread';
import { BodyText } from './Typography';

export type HistoryStatus = 'workout' | 'rest' | 'missed';

export interface HistoryEntry {
  date: string; // YYYY-MM-DD
  status: HistoryStatus;
  workout_name?: string | null;
}

interface HistoryThreadProps {
  entries: HistoryEntry[];
  testID?: string;
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const formatDay = (isoDate: string) => {
  // isoDate assumed YYYY-MM-DD; parse as local to avoid TZ drift
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return DAY_LABELS[dt.getDay()];
};

const formatMonthDay = (isoDate: string) => {
  const [, m, d] = isoDate.split('-');
  return `${m}/${d}`;
};

interface RowProps {
  entry: HistoryEntry;
  testID?: string;
}

const HistoryRow: React.FC<RowProps> = ({ entry, testID }) => {
  const isMissed = entry.status === 'missed';
  const isWorkout = entry.status === 'workout';

  return (
    <ThreadEntry surface="ink" testID={testID}>
      <View style={styles.row}>
        <View style={styles.dateCol}>
          <BodyText variant="caption" tone="slate">
            {formatDay(entry.date)}
          </BodyText>
          <BodyText variant="caption" tone="slate" style={styles.date}>
            {formatMonthDay(entry.date)}
          </BodyText>
        </View>
        <View style={styles.middleCol}>
          {isWorkout ? (
            <BodyText variant="bodyMedium" tone="bone">
              {entry.workout_name || 'Workout'}
            </BodyText>
          ) : isMissed ? (
            <BodyText tone="slate">Missed</BodyText>
          ) : (
            <BodyText tone="slate">Rest day</BodyText>
          )}
        </View>
        <View style={styles.iconCol}>
          {isWorkout ? (
            <LineIcon name="check" size={16} tone="moss" />
          ) : isMissed ? (
            <LineIcon name="x" size={16} tone="slate" />
          ) : (
            <LineIcon name="moon" size={16} tone="slate" />
          )}
        </View>
      </View>
    </ThreadEntry>
  );
};

export const HistoryThread: React.FC<HistoryThreadProps> = ({
  entries,
  testID,
}) => {
  return (
    <View testID={testID}>
      <BodyText variant="label" tone="slate" style={styles.label}>
        Last 5 days
      </BodyText>
      {entries.length === 0 ? (
        <BodyText variant="caption" tone="slate" style={styles.empty}>
          Your thread begins today.
        </BodyText>
      ) : (
        <Thread surface="ink">
          {entries.map((e, i) => (
            <HistoryRow
              key={`${e.date}-${i}`}
              entry={e}
              testID={`history-row-${e.date}`}
            />
          ))}
        </Thread>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs,
    paddingLeft: 0,
  },
  empty: {
    paddingLeft: spacing.lg,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateCol: {
    width: 56,
  },
  middleCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  date: {
    marginTop: 2,
  },
  iconCol: {
    width: 20,
    alignItems: 'flex-end',
  },
});

// Ensure ThreadEntry ships through the tree unchanged.
void colors;
