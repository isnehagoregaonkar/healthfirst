import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/tokens';
import { formatDayShort } from '../../water/waterDayUtils';
import type { FastingSession } from '../fastingTypes';
import { FastingHistoryRow } from './FastingHistoryRow';

type FastingHistorySectionProps = Readonly<{
  filteredHistory: FastingSession[];
  selectedDay: Date;
}>;

export function FastingHistorySection({
  filteredHistory,
  selectedDay,
}: FastingHistorySectionProps) {
  return (
    <>
      <Text style={[styles.sectionHeading, styles.sectionHeadingSpaced]}>
        Recent fasts
      </Text>
      <Text style={styles.sectionHint}>
        {filteredHistory.length === 0
          ? 'No completed fasts on this day.'
          : `${filteredHistory.length} on ${formatDayShort(selectedDay)}`}
      </Text>
      {filteredHistory.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="history" size={36} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Nothing on this day</Text>
          <Text style={styles.emptySub}>
            Try another date, or end a fast to log it on the day it finishes.
          </Text>
        </View>
      ) : (
        filteredHistory.map(row => <FastingHistoryRow key={row.id} row={row} />)
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sectionHeadingSpaced: {
    marginTop: 14,
  },
  sectionHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: -8,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
