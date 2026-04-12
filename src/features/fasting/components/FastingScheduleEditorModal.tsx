import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/tokens';
import { WEEKDAY_SHORT_LABELS } from '../fastingConstants';
import { formatTimeOfDay } from '../fastingScreenFormat';
import type { TimeOfDay } from '../fastingTypes';

type FastingScheduleEditorModalProps = Readonly<{
  visible: boolean;
  weekdays: readonly number[];
  onToggleWeekday: (day: number) => void;
  startFast: TimeOfDay;
  endFast: TimeOfDay;
  onOpenStartPicker: () => void;
  onOpenEndPicker: () => void;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}>;

export function FastingScheduleEditorModal({
  visible,
  weekdays,
  onToggleWeekday,
  startFast,
  endFast,
  onOpenStartPicker,
  onOpenEndPicker,
  error,
  onSave,
  onCancel,
}: FastingScheduleEditorModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>Schedule a fast</Text>
          <Text style={styles.sub}>
            Pick days and times as a reference for your routine (no automatic
            start or notifications yet).
          </Text>

          <Text style={styles.label}>Days</Text>
          <View style={styles.dayRow}>
            {WEEKDAY_SHORT_LABELS.map((label, day) => {
              const on = weekdays.includes(day);
              return (
                <Pressable
                  key={label}
                  onPress={() => onToggleWeekday(day)}
                  style={({ pressed }) => [
                    styles.dayChip,
                    on && styles.dayChipOn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={onOpenStartPicker}
            style={({ pressed }) => [styles.timeRow, pressed && styles.pressed]}
          >
            <Text style={styles.timeRowLabel}>Start fast</Text>
            <Text style={styles.timeRowValue}>
              {formatTimeOfDay(startFast.hour, startFast.minute)}
            </Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={onOpenEndPicker}
            style={({ pressed }) => [styles.timeRow, pressed && styles.pressed]}
          >
            <Text style={styles.timeRowLabel}>End fast</Text>
            <Text style={styles.timeRowValue}>
              {formatTimeOfDay(endFast.hour, endFast.minute)}
            </Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
            >
              <Text style={styles.btnPrimaryText}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    maxHeight: '90%',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  dayChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayChipOn: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}18`,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayChipTextOn: {
    color: colors.primary,
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
  error: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  btnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btnGhostText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  btnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: colors.primary,
    borderRadius: 14,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
  pressed: {
    opacity: 0.88,
  },
});
