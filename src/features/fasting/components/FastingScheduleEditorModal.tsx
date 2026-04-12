import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/tokens';
import { WEEKDAY_COMPACT_LABELS } from '../fastingConstants';
import {
  formatCustomFastDurationLabel,
  matchingSchedulePreset,
  SCHEDULE_FAST_DURATION_PRESETS,
  startTimeForOvernightDuration,
} from '../fastingScheduleDuration';
import { formatTimeOfDay } from '../fastingScreenFormat';
import type { TimeOfDay } from '../fastingTypes';
import { FastingTimePickerPopup } from './FastingTimePickerPopup';

type FastingScheduleEditorModalProps = Readonly<{
  visible: boolean;
  remindersEnabled: boolean;
  reminderError: string | null;
  onToggleReminders: (enabled: boolean) => void;
  weekdays: readonly number[];
  onToggleWeekday: (day: number) => void;
  startFast: TimeOfDay;
  endFast: TimeOfDay;
  onChangeStartFast: (date: Date) => void;
  onChangeEndFast: (date: Date) => void;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}>;

export function FastingScheduleEditorModal({
  visible,
  remindersEnabled,
  reminderError,
  onToggleReminders,
  weekdays,
  onToggleWeekday,
  startFast,
  endFast,
  onChangeStartFast,
  onChangeEndFast,
  error,
  onSave,
  onCancel,
}: FastingScheduleEditorModalProps) {
  const [timePopup, setTimePopup] = useState<'start' | 'end' | null>(null);
  const [popupDraft, setPopupDraft] = useState(() => new Date());

  useEffect(() => {
    if (!visible) {
      setTimePopup(null);
    }
  }, [visible]);

  const activePreset = useMemo(
    () => matchingSchedulePreset(startFast, endFast),
    [startFast, endFast],
  );

  const applyDurationPreset = (
    hours: (typeof SCHEDULE_FAST_DURATION_PRESETS)[number],
  ) => {
    const nextStart = startTimeForOvernightDuration(endFast, hours);
    const d = new Date();
    d.setHours(nextStart.hour, nextStart.minute, 0, 0);
    onChangeStartFast(d);
  };

  const openStartPopup = () => {
    const d = new Date();
    d.setHours(startFast.hour, startFast.minute, 0, 0);
    setPopupDraft(d);
    setTimePopup('start');
  };

  const openEndPopup = () => {
    const d = new Date();
    d.setHours(endFast.hour, endFast.minute, 0, 0);
    setPopupDraft(d);
    setTimePopup('end');
  };

  const saveTimePopup = () => {
    const next = new Date(popupDraft);
    if (timePopup === 'start') {
      onChangeStartFast(next);
    } else if (timePopup === 'end') {
      onChangeEndFast(next);
    }
    setTimePopup(null);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.shell} pointerEvents="box-none">
        <Pressable
          style={[StyleSheet.absoluteFill, styles.dim]}
          onPress={onCancel}
          accessibilityLabel="Dismiss schedule editor"
        />
        <View style={styles.cardOuter} pointerEvents="box-none">
          {/* removeClippedSubviews=false: nested scroll wheels stay visible */}
          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.cardScrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            removeClippedSubviews={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.title}>Schedule a fast</Text>
              <Text style={styles.sub}>
                Pick days, Fast Duration, and Start Fast / End Fast times.
                Reminders use these times when enabled.
              </Text>

              <Text style={styles.label}>Days</Text>
              <View style={styles.dayRow}>
                {WEEKDAY_COMPACT_LABELS.map((label, day) => {
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
                      <Text
                        style={[styles.dayChipText, on && styles.dayChipTextOn]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, styles.labelAfterDays]}>
                Fast Duration
              </Text>
              <View style={styles.presetRow}>
                {SCHEDULE_FAST_DURATION_PRESETS.map(h => {
                  const on = activePreset === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => applyDurationPreset(h)}
                      style={({ pressed }) => [
                        styles.presetChip,
                        on && styles.presetChipOn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          on && styles.presetChipTextOn,
                        ]}
                        numberOfLines={1}
                      >
                        {h}h
                      </Text>
                    </Pressable>
                  );
                })}
                {activePreset === null ? (
                  <View
                    style={[styles.presetChip, styles.presetChipOn]}
                    accessibilityLabel={`Custom fast length ${formatCustomFastDurationLabel(
                      startFast,
                      endFast,
                    )}`}
                    accessibilityState={{ selected: true }}
                  >
                    <Text
                      style={[styles.presetChipText, styles.presetChipTextOn]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.65}
                    >
                      {formatCustomFastDurationLabel(startFast, endFast)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Pressable
                onPress={openStartPopup}
                accessibilityRole="button"
                accessibilityLabel="Change Start Fast time"
                style={({ pressed }) => [
                  styles.timeRow,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.timeRowLabel}>Start Fast</Text>
                <Text style={styles.timeRowValue}>
                  {formatTimeOfDay(startFast.hour, startFast.minute)}
                </Text>
                <Icon
                  name="chevron-right"
                  size={22}
                  color={colors.textSecondary}
                />
              </Pressable>

              <Pressable
                onPress={openEndPopup}
                accessibilityRole="button"
                accessibilityLabel="Change End Fast time"
                style={({ pressed }) => [
                  styles.timeRow,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.timeRowLabel}>End Fast</Text>
                <Text style={styles.timeRowValue}>
                  {formatTimeOfDay(endFast.hour, endFast.minute)}
                </Text>
                <Icon
                  name="chevron-right"
                  size={22}
                  color={colors.textSecondary}
                />
              </Pressable>

              <View style={styles.reminderRow}>
                <View style={styles.reminderTextCol}>
                  <Text style={styles.label}>Reminders</Text>
                  <Text style={styles.reminderSub}>
                    Notify at the start and end times above.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Fasting reminders in schedule editor"
                  value={remindersEnabled}
                  onValueChange={onToggleReminders}
                  trackColor={{
                    false: colors.border,
                    true: `${colors.primary}88`,
                  }}
                  thumbColor={
                    remindersEnabled ? colors.primary : colors.surface
                  }
                />
              </View>
              {reminderError ? (
                <Text style={styles.reminderError}>{reminderError}</Text>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.actions}>
                <Pressable
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.btnGhost,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={onSave}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.btnPrimaryText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
        <FastingTimePickerPopup
          visible={timePopup !== null}
          title={
            timePopup === 'start'
              ? 'Scheduled Start Fast Time'
              : 'Scheduled End Fast Time'
          }
          draft={popupDraft}
          onDraftChange={setPopupDraft}
          onSave={saveTimePopup}
          onCancel={() => setTimePopup(null)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    justifyContent: 'center',
  },
  dim: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  cardOuter: {
    paddingHorizontal: 16,
    maxHeight: '92%',
    width: '100%',
    alignSelf: 'center',
  },
  cardScroll: {
    maxHeight: '100%',
  },
  cardScrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
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
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 8,
  },
  dayChip: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipOn: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}18`,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dayChipTextOn: {
    color: colors.primary,
  },
  labelAfterDays: {
    marginTop: 10,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipOn: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}18`,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  presetChipTextOn: {
    color: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  /** Section title: same as Days / Fast Duration / Reminders. */
  timeRowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  timeRowValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 4,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  reminderTextCol: {
    flex: 1,
    minWidth: 0,
  },
  reminderSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 4,
  },
  reminderError: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
    marginTop: 8,
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
