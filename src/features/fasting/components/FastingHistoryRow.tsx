import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/tokens';
import type { FastingSession } from '../fastingTypes';
import { formatShortDate, historySubtitle } from '../fastingScreenFormat';

type FastingHistoryRowProps = Readonly<{
  row: FastingSession;
}>;

export function FastingHistoryRow({ row }: FastingHistoryRowProps) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyIcon}>
        <Icon name="check-circle-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.historyBody}>
        <Text style={styles.historyTitle}>{formatShortDate(row.startedAt)}</Text>
        <Text style={styles.historyMeta}>{historySubtitle(row)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  historyRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
    minWidth: 0,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  historyMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
