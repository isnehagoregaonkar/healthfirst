import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen } from '../../components/layout/Screen';
import { colors } from '../../theme/tokens';
import type { TimeOfDay } from '../fasting/fastingTypes';
import { ReminderTimePickerModal } from './ReminderTimePickerModal';
import { useRemindersScreen } from './hooks/useRemindersScreen';
import { formatReminderTime } from './remindersTimeFormat';
import { WATER_REMINDER_SLOT_COUNT } from './remindersWaterConstants';

type TimeEdit =
  | { key: 'water'; index: number }
  | { key: 'meal'; slot: 'breakfast' | 'lunch' | 'dinner' }
  | { key: 'fast'; slot: 'begin' | 'break' };

export function RemindersScreen() {
  const s = useRemindersScreen();
  const [timeEdit, setTimeEdit] = useState<TimeEdit | null>(null);

  const getInitialForEdit = useCallback((): TimeOfDay => {
    if (!timeEdit) {
      return { hour: 9, minute: 0 };
    }
    if (timeEdit.key === 'water') {
      return s.general.water.times[timeEdit.index] ?? { hour: 9, minute: 0 };
    }
    if (timeEdit.key === 'meal') {
      return s.general.meals[timeEdit.slot];
    }
    return timeEdit.slot === 'begin'
      ? s.fastingReminders.beginFast
      : s.fastingReminders.breakFast;
  }, [timeEdit, s.general, s.fastingReminders]);

  const titleForEdit = useCallback((): string => {
    if (!timeEdit) {
      return 'Time';
    }
    if (timeEdit.key === 'water') {
      return `Water reminder ${
        timeEdit.index + 1
      } of ${WATER_REMINDER_SLOT_COUNT}`;
    }
    if (timeEdit.key === 'meal') {
      const labels = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
      } as const;
      return `${labels[timeEdit.slot]} reminder`;
    }
    return timeEdit.slot === 'begin'
      ? 'Start fast reminder'
      : 'Break fast reminder';
  }, [timeEdit]);

  const onSaveTime = useCallback(
    async (t: TimeOfDay) => {
      if (!timeEdit) {
        return;
      }
      if (timeEdit.key === 'water') {
        await s.setWaterTimeAtIndex(timeEdit.index, t);
      } else if (timeEdit.key === 'meal') {
        await s.setMealSlotTime(timeEdit.slot, t);
      } else if (timeEdit.slot === 'begin') {
        await s.setFastingBeginTime(t);
      } else {
        await s.setFastingBreakTime(t);
      }
      setTimeEdit(null);
    },
    [timeEdit, s],
  );

  if (s.loading) {
    return (
      <Screen
        applyTopSafeArea={false}
        applyBottomSafeArea={false}
        backgroundColor="#F8FAFC"
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading reminders…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      applyTopSafeArea={false}
      applyBottomSafeArea={false}
      backgroundColor="#F8FAFC"
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {s.notifeeAvailable ? null : (
          <View style={styles.warnBanner}>
            <Icon name="bell-off-outline" size={22} color="#B45309" />
            <Text style={styles.warnText}>
              Push reminders need the Notifee native module. Use a full dev
              build (not a JS-only bundle) after installing pods so scheduled
              alerts can fire.
            </Text>
          </View>
        )}

        {s.saving ? (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.savingText}>Updating…</Text>
          </View>
        ) : null}

        <Text style={styles.lead}>
          Turn on nudges for water, meals, and fasting. Times use your phone's
          local clock.
        </Text>

        {/* Meals */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View
              style={[
                styles.iconBubble,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Icon name="food-apple" size={22} color={colors.primary} />
            </View>
            <View style={styles.cardHeadText}>
              <Text style={styles.cardTitle}>Meal tracking</Text>
              <Text style={styles.cardSub}>
                Breakfast, lunch, and dinner nudges
              </Text>
            </View>
            <Switch
              accessibilityLabel="Meal reminders"
              value={s.general.meals.enabled}
              onValueChange={v => s.setMealsEnabled(v).catch(() => {})}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={
                s.general.meals.enabled ? colors.primary : colors.surface
              }
            />
          </View>
          {(
            [
              ['breakfast', 'Breakfast'],
              ['lunch', 'Lunch'],
              ['dinner', 'Dinner'],
            ] as const
          ).map(([slot, label]) => (
            <Pressable
              key={slot}
              accessibilityRole="button"
              accessibilityLabel={`Change ${label} reminder time`}
              disabled={!s.general.meals.enabled}
              onPress={() => setTimeEdit({ key: 'meal', slot })}
              style={({ pressed }) => [
                styles.timeRow,
                !s.general.meals.enabled && styles.timeRowDisabled,
                pressed && s.general.meals.enabled && styles.timeRowPressed,
              ]}
            >
              <Text style={styles.timeRowLabel}>{label}</Text>
              <Text style={styles.timeRowValue}>
                {formatReminderTime(s.general.meals[slot])}
              </Text>
              <Icon
                name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          ))}
        </View>

        {/* Fasting */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.iconBubble, { backgroundColor: '#F3E8FF' }]}>
              <Icon name="timer-outline" size={22} color="#7C3AED" />
            </View>
            <View style={styles.cardHeadText}>
              <Text style={styles.cardTitle}>Fasting</Text>
              <Text style={styles.cardSub}>
                Start-fast alert (break alert is set when you begin a fast)
              </Text>
            </View>
            <Switch
              accessibilityLabel="Fasting reminders"
              value={s.fastingReminders.enabled}
              onValueChange={v => s.setFastingEnabled(v).catch(() => {})}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={
                s.fastingReminders.enabled ? colors.primary : colors.surface
              }
            />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!s.fastingReminders.enabled}
            onPress={() => setTimeEdit({ key: 'fast', slot: 'begin' })}
            style={({ pressed }) => [
              styles.timeRow,
              !s.fastingReminders.enabled && styles.timeRowDisabled,
              pressed && s.fastingReminders.enabled && styles.timeRowPressed,
            ]}
          >
            <Text style={styles.timeRowLabel}>Start fast</Text>
            <Text style={styles.timeRowValue}>
              {formatReminderTime(s.fastingReminders.beginFast)}
            </Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!s.fastingReminders.enabled}
            onPress={() => setTimeEdit({ key: 'fast', slot: 'break' })}
            style={({ pressed }) => [
              styles.timeRow,
              styles.timeRowLast,
              !s.fastingReminders.enabled && styles.timeRowDisabled,
              pressed && s.fastingReminders.enabled && styles.timeRowPressed,
            ]}
          >
            <Text style={styles.timeRowLabel}>Break fast (scheduled)</Text>
            <Text style={styles.timeRowValue}>
              {formatReminderTime(s.fastingReminders.breakFast)}
            </Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.hint}>
            The break-fast notification is scheduled when you start a fast,
            using your eating window length.
          </Text>
        </View>
        {/* Water */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.iconBubble, { backgroundColor: '#E0F2FE' }]}>
              <Icon name="cup-water" size={22} color="#0284C7" />
            </View>
            <View style={styles.cardHeadText}>
              <Text style={styles.cardTitle}>Water</Text>
              <Text style={styles.cardSub}>
                {WATER_REMINDER_SLOT_COUNT} daytime nudges — set each time below
              </Text>
            </View>
            <Switch
              accessibilityLabel="Water reminders"
              value={s.general.water.enabled}
              onValueChange={v => s.setWaterEnabled(v).catch(() => {})}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={
                s.general.water.enabled ? colors.primary : colors.surface
              }
            />
          </View>
          {Array.from({ length: WATER_REMINDER_SLOT_COUNT }, (_, index) => {
            const t = s.general.water.times[index] ?? { hour: 12, minute: 0 };
            const isLast = index === WATER_REMINDER_SLOT_COUNT - 1;
            return (
              <Pressable
                key={`water-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Change water reminder ${index + 1} time`}
                disabled={!s.general.water.enabled}
                onPress={() => setTimeEdit({ key: 'water', index })}
                style={({ pressed }) => [
                  styles.timeRow,
                  isLast && styles.timeRowLast,
                  !s.general.water.enabled && styles.timeRowDisabled,
                  pressed && s.general.water.enabled && styles.timeRowPressed,
                ]}
              >
                <Text style={styles.timeRowLabel}>Reminder {index + 1}</Text>
                <Text style={styles.timeRowValue}>{formatReminderTime(t)}</Text>
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <ReminderTimePickerModal
        visible={timeEdit != null}
        title={titleForEdit()}
        initial={getInitialForEdit()}
        onSave={t => onSaveTime(t).catch(() => {})}
        onCancel={() => setTimeEdit(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  warnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 19,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  savingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  lead: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginBottom: 2,
    borderRadius: 12,
  },
  timeRowLast: {
    marginBottom: 8,
  },
  timeRowDisabled: {
    opacity: 0.45,
  },
  timeRowPressed: {
    backgroundColor: colors.background,
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
    color: colors.textSecondary,
    marginRight: 4,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingBottom: 14,
    marginTop: -4,
  },
});
