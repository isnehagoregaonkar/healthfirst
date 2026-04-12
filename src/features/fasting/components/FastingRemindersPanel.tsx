import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '../../../theme/tokens';
import type { FastingReminderSettings } from '../fastingTypes';

type FastingRemindersPanelProps = Readonly<{
  reminders: FastingReminderSettings;
  reminderError: string | null;
  onToggleEnabled: (enabled: boolean) => void;
}>;

export function FastingRemindersPanel({
  reminders,
  reminderError,
  onToggleEnabled,
}: FastingRemindersPanelProps) {
  return (
    <View style={styles.reminderCard}>
      <View style={styles.reminderHeaderRow}>
        <View style={styles.reminderTitleCol}>
          <Text style={styles.reminderMainTitle}>Reminders</Text>
          <Text style={styles.reminderSub}>
            Nudges when you schedule your fast. Set times in Schedule a fast.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Fasting reminders"
          value={reminders.enabled}
          onValueChange={onToggleEnabled}
          trackColor={{ false: colors.border, true: `${colors.primary}88` }}
          thumbColor={reminders.enabled ? colors.primary : colors.surface}
        />
      </View>
      {reminderError ? (
        <Text style={styles.reminderError}>{reminderError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  reminderCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  reminderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reminderTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  reminderMainTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reminderSub: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  reminderError: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
});
