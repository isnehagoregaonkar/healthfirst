import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/tokens';
import { MAX_SCHEDULED_FASTS } from '../fastingConstants';
import { formatScheduledFastSummary } from '../fastingScreenFormat';
import type { ScheduledFast } from '../fastingTypes';

type FastingScheduledSectionProps = Readonly<{
  scheduledFasts: readonly ScheduledFast[];
  onDelete: (id: string) => void;
  onPressScheduleAnother: () => void;
}>;

export function FastingScheduledSection({
  scheduledFasts,
  onDelete,
  onPressScheduleAnother,
}: FastingScheduledSectionProps) {
  const atLimit = scheduledFasts.length >= MAX_SCHEDULED_FASTS;

  return (
    <>
      <Text style={[styles.sectionHeading, styles.sectionHeadingSpaced]}>
        Scheduled fasts
      </Text>
      <Text style={styles.sectionHint}>
        Plan recurring windows. These are saved on this device only.
      </Text>

      {scheduledFasts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="calendar-clock" size={36} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No schedules yet</Text>
          <Text style={styles.emptySub}>
            Add one to remember when you intend to start and end your fast.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {scheduledFasts.map(row => (
            <View key={row.id} style={styles.row}>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {formatScheduledFastSummary(row)}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Delete scheduled fast"
                onPress={() => onDelete(row.id)}
                style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
              >
                <Icon name="trash-can-outline" size={22} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={onPressScheduleAnother}
        disabled={atLimit}
        style={({ pressed }) => [
          styles.scheduleBtn,
          atLimit && styles.scheduleBtnDisabled,
          pressed && !atLimit && styles.pressed,
        ]}
      >
        <Icon
          name="calendar-plus"
          size={22}
          color={atLimit ? colors.textSecondary : colors.primary}
        />
        <Text style={[styles.scheduleBtnText, atLimit && styles.scheduleBtnTextMuted]}>
          Schedule another fast
        </Text>
      </Pressable>
      {atLimit ? (
        <Text style={styles.limitHint}>
          Maximum {MAX_SCHEDULED_FASTS} schedules. Delete one to add another.
        </Text>
      ) : null}
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
    lineHeight: 18,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginBottom: 12,
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
  list: {
    gap: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowTextCol: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  deleteBtn: {
    padding: 8,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  scheduleBtnDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
    opacity: 0.85,
  },
  scheduleBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  scheduleBtnTextMuted: {
    color: colors.textSecondary,
  },
  limitHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
