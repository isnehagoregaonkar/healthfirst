import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen } from '../../components/layout/Screen';
import { ScreenTopCard } from '../../components/screenTop';
import { colors } from '../../theme/tokens';
import { FastingFastLengthChips } from './components/FastingFastLengthChips';
import { FastingHistorySection } from './components/FastingHistorySection';
import { FastingMotivationBanner } from './components/FastingMotivationBanner';
import { FastingRemindersPanel } from './components/FastingRemindersPanel';
import { FastingScheduleEditorModal } from './components/FastingScheduleEditorModal';
import { FastingScheduledSection } from './components/FastingScheduledSection';
import { FastingTimePickers } from './components/FastingTimePickers';
import { FastingTimerSection } from './components/FastingTimerSection';
import { useIntermittentFastingScreen } from './hooks/useIntermittentFastingScreen';

export function IntermittentFastingScreen() {
  const s = useIntermittentFastingScreen();
  let pickerTitle = '';
  if (s.pickerTarget === 'begin') {
    pickerTitle = 'Begin fasting reminder';
  } else if (s.pickerTarget === 'break') {
    pickerTitle = 'Break fast reminder';
  } else if (s.pickerTarget === 'schedule-start') {
    pickerTitle = 'Scheduled start fast time';
  } else if (s.pickerTarget === 'schedule-end') {
    pickerTitle = 'Scheduled end fast time';
  }

  return (
    <Screen applyTopSafeArea={false} applyBottomSafeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTopCard
          mode="date"
          selectedDay={s.selectedDay}
          onSelectDay={s.selectDay}
          stripScope="scrollablePast"
        />

        {s.loading ? (
          <View style={styles.loadRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadLabel}>Loading…</Text>
          </View>
        ) : (
          <>
            <FastingTimerSection
              isFasting={s.isFasting}
              elapsedMs={s.elapsedMs}
              targetFastHours={s.targetFastHours}
              eatingHours={s.eatingHours}
              progressPct={s.progressPct}
            />
            <FastingMotivationBanner line={s.motivationalLine} />
            <FastingFastLengthChips
              preferredHours={s.preferredFastHours}
              targetFastHours={s.targetFastHours}
              onSelectHours={h => void s.setTargetFastHours(h)}
            />
            <FastingRemindersPanel
              reminders={s.reminders}
              reminderError={s.reminderError}
              onToggleEnabled={v => void s.toggleReminders(v)}
              onOpenBeginPicker={() => s.openTimePicker('begin')}
              onOpenBreakPicker={() => s.openTimePicker('break')}
            />
            {s.isFasting ? (
              <Pressable
                onPress={() => void s.endFast()}
                style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
              >
                <Icon name="stop-circle-outline" size={22} color={colors.surface} />
                <Text style={styles.dangerBtnText}>End fast</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void s.startFast()}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              >
                <Icon name="play-circle-outline" size={22} color={colors.surface} />
                <Text style={styles.primaryBtnText}>Start fast</Text>
              </Pressable>
            )}
            <FastingScheduledSection
              scheduledFasts={s.scheduledFasts}
              onDelete={id => void s.deleteScheduledFast(id)}
              onPressScheduleAnother={s.openScheduleEditor}
            />
            <FastingHistorySection
              filteredHistory={s.filteredHistory}
              selectedDay={s.selectedDay}
            />
          </>
        )}
      </ScrollView>

      <FastingTimePickers
        pickerTarget={s.pickerTarget}
        iosDraft={s.iosDraft}
        setIosDraft={s.setIosDraft}
        pickerTitle={pickerTitle}
        onAndroidTimePicked={d => void s.commitAndroidTime(d)}
        onAndroidDismiss={s.dismissPicker}
        onIosSave={() => void s.confirmIosTime()}
        onIosCancel={s.cancelIosPicker}
      />

      <FastingScheduleEditorModal
        visible={s.scheduleEditorOpen}
        weekdays={s.scheduleDraftWeekdays}
        onToggleWeekday={s.toggleScheduleWeekday}
        startFast={s.scheduleDraftStart}
        endFast={s.scheduleDraftEnd}
        onOpenStartPicker={() => s.openTimePicker('schedule-start')}
        onOpenEndPicker={() => s.openTimePicker('schedule-end')}
        error={s.scheduleEditorError}
        onSave={() => void s.saveScheduleDraft()}
        onCancel={s.closeScheduleEditor}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 28,
  },
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  loadLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.error,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.surface,
  },
  dangerBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.surface,
  },
  pressed: {
    opacity: 0.9,
  },
});
