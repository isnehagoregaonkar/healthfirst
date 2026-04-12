import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/tokens';
import type { FastingReminderSettings } from '../fastingTypes';
import { formatTimeOfDay } from '../fastingScreenFormat';

type FastingRemindersPanelProps = Readonly<{
  reminders: FastingReminderSettings;
  reminderError: string | null;
  onToggleEnabled: (enabled: boolean) => void;
  onOpenBeginPicker: () => void;
  onOpenBreakPicker: () => void;
}>;

export function FastingRemindersPanel({
  reminders,
  reminderError,
  onToggleEnabled,
  onOpenBeginPicker,
  onOpenBreakPicker,
}: FastingRemindersPanelProps) {
  return (
    <View style={styles.reminderCard}>
      <View style={styles.reminderHeaderRow}>
        <View style={styles.reminderTitleCol}>
          <Text style={styles.reminderMainTitle}>Reminders</Text>
          <Text style={styles.reminderSub}>
            Daily nudges when your fast starts and when you can eat again.
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
      {reminders.enabled ? (
        <>
          <Pressable
            onPress={onOpenBeginPicker}
            style={({ pressed }) => [styles.timeRow, pressed && styles.timeRowPressed]}
          >
            <Text style={styles.timeRowLabel}>Begin fasting</Text>
            <Text style={styles.timeRowValue}>
              {formatTimeOfDay(reminders.beginFast.hour, reminders.beginFast.minute)}
            </Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={onOpenBreakPicker}
            style={({ pressed }) => [styles.timeRow, pressed && styles.timeRowPressed]}
          >
            <Text style={styles.timeRowLabel}>Break fast</Text>
            <Text style={styles.timeRowValue}>
              {formatTimeOfDay(reminders.breakFast.hour, reminders.breakFast.minute)}
            </Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>
        </>
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
    marginBottom: 4,
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 8,
  },
  timeRowPressed: {
    opacity: 0.85,
  },
  timeRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeRowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
});
