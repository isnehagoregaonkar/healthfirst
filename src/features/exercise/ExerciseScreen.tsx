import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen } from '../../components/layout/Screen';
import { ExerciseDayStrip } from './components/ExerciseDayStrip';
import { exerciseTheme as t } from './exerciseTheme';
import { useExerciseScreen } from './hooks/useExerciseScreen';
import type { ExerciseSessionRow } from './exerciseTypes';
import { formatSessionClock } from './utils/exerciseDayUtils';

const STEP_GOAL_DEFAULT = 10_000;
const ACTIVITIES = [
  'Walk',
  'Run',
  'Cycle',
  'Strength',
  'Yoga',
  'Swim',
  'Other',
] as const;

function formatHydrationDayMl(ml: number): string {
  if (ml <= 0) {
    return 'No entries today';
  }
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(1)} L`;
  }
  return `${Math.round(ml)} ml`;
}

function sourceLabel(source: ExerciseSessionRow['source']): string {
  switch (source) {
    case 'apple_health':
      return 'Apple Health';
    case 'health_connect':
      return 'Health Connect';
    default:
      return 'This app';
  }
}

function StepsHero({
  steps,
  goal,
}: Readonly<{ steps: number; goal: number }>) {
  const pct = Math.min(100, Math.round((steps / Math.max(goal, 1)) * 100));
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTop}>
        <View style={styles.stepsIconWrap}>
          <Icon name="shoe-print" size={26} color={t.stepsTint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroEyebrow}>Today</Text>
          <Text style={styles.heroSteps}>
            {steps.toLocaleString()}{' '}
            <Text style={styles.heroStepsUnit}>steps</Text>
          </Text>
          <Text style={styles.heroGoal}>
            Goal {goal.toLocaleString()} · {pct}% of goal
          </Text>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function HistoryCard({ row, timeLabel }: Readonly<{ row: ExerciseSessionRow; timeLabel: string }>) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyIcon}>
        <Icon name="dumbbell" size={20} color={t.accent} />
      </View>
      <View style={styles.historyBody}>
        <Text style={styles.historyTitle} numberOfLines={2}>
          {row.title}
        </Text>
        <Text style={styles.historyMeta}>
          {timeLabel}
          {row.deviceLabel ? ` · ${row.deviceLabel}` : ''}
        </Text>
        <View style={styles.historyPills}>
          <Text style={styles.pill}>{row.durationMin} min</Text>
          {row.calories != null ? (
            <Text style={styles.pill}>{row.calories} kcal</Text>
          ) : null}
          {row.distanceKm != null ? (
            <Text style={styles.pill}>{row.distanceKm} km</Text>
          ) : null}
          <Text style={[styles.pill, styles.pillSource]}>{sourceLabel(row.source)}</Text>
        </View>
      </View>
    </View>
  );
}

export function ExerciseScreen() {
  const {
    loading,
    refresh,
    selectedDay,
    setSelectedDay,
    isViewingToday,
    selectedDayLabel,
    stepsToday,
    combinedHistory,
    sessionsForSelectedDay,
    healthOk,
    iosHealthError,
    appleHealthReadHint,
    androidStatus,
    androidHealthHint,
    healthConnectInsight,
    integrationSubtitle,
    openAndroidHealthSettings,
    openIosHealthApp,
    openIosHealthSettings,
    logManual,
  } = useExerciseScreen();

  const [logOpen, setLogOpen] = useState(false);
  const [activity, setActivity] = useState<string>(ACTIVITIES[0]);
  const [durationText, setDurationText] = useState('30');
  const [syncApple, setSyncApple] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh, selectedDay]);

  const onSaveManual = async () => {
    const mins = Number.parseInt(durationText.replace(/\D/g, ''), 10);
    if (!Number.isFinite(mins) || mins <= 0) {
      return;
    }
    setSaving(true);
    try {
      await logManual(activity, mins, Platform.OS === 'ios' && syncApple);
      setLogOpen(false);
      setDurationText('30');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen backgroundColor="#F8FAFC" applyBottomSafeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void refresh()} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Exercise</Text>
        <Text style={styles.screenSub}>
          Steps from your phone or watch, workouts from Apple Health / Health Connect, plus
          sessions you log here.
        </Text>

        <ExerciseDayStrip selectedDay={selectedDay} onSelectDay={setSelectedDay} />

        {!isViewingToday ? (
          <Text style={styles.pastHint}>
            Viewing {selectedDayLabel} — workouts below are for this day only.
          </Text>
        ) : null}

        {isViewingToday ? (
          <StepsHero steps={stepsToday} goal={STEP_GOAL_DEFAULT} />
        ) : Platform.OS === 'android' ? (
          <View style={styles.stepsPastCard}>
            <Text style={styles.stepsPastEyebrow}>Steps · {selectedDayLabel}</Text>
            <Text style={styles.stepsPastBody}>
              {stepsToday > 0
                ? `${stepsToday.toLocaleString()} steps from Health Connect for this day.`
                : 'No step records in Health Connect for this calendar day (or they have not synced yet). Pull to refresh after Samsung / Health Connect sync.'}
            </Text>
          </View>
        ) : (
          <View style={styles.stepsPastCard}>
            <Text style={styles.stepsPastEyebrow}>Steps</Text>
            <Text style={styles.stepsPastBody}>
              Step count syncs for today after you refresh. Scroll the dates above to browse
              workouts from other days.
            </Text>
          </View>
        )}

        <View style={styles.integrationCard}>
          <View style={styles.integrationHeader}>
            <Icon
              name={healthOk ? 'check-decagram' : 'shield-sync-outline'}
              size={22}
              color={healthOk ? t.stepsTint : t.accent}
            />
            <Text style={styles.integrationTitle}>
              {Platform.OS === 'ios'
                ? 'Apple Health'
                : Platform.OS === 'android'
                  ? 'Health Connect'
                  : 'Device health'}
            </Text>
          </View>
          <Text style={styles.integrationBody}>{integrationSubtitle}</Text>
          {Platform.OS === 'android' ? (
            <View style={styles.hcInsightBlock}>
              <Text style={styles.hcInsightTitle}>Other Health Connect data</Text>
              <Text style={styles.hcInsightLine}>
                Workout sessions (loaded):{' '}
                {healthConnectInsight.workoutSessionsLoaded.toLocaleString()}
              </Text>
              <Text style={styles.hcInsightLine}>
                Hydration (this day): {formatHydrationDayMl(healthConnectInsight.hydrationDayMl)}
              </Text>
              <Text style={styles.hcInsightLine}>
                Nutrition (this day):{' '}
                {healthConnectInsight.nutritionEntriesOnDay.toLocaleString()} entries ·{' '}
                {healthConnectInsight.nutritionEnergyKcalOnDay.toLocaleString()} kcal
              </Text>
              <Text style={styles.hcInsightLine}>
                Weight (this day):{' '}
                {healthConnectInsight.weightKgOnDay != null
                  ? `${healthConnectInsight.weightKgOnDay.toFixed(1)} kg`
                  : '—'}{' '}
                · {healthConnectInsight.weightReadingsOnDay.toLocaleString()} reading(s)
              </Text>
              <Text style={styles.hcInsightLine}>
                Active calories (this day):{' '}
                {healthConnectInsight.activeCaloriesDayKcal != null
                  ? `${Math.round(healthConnectInsight.activeCaloriesDayKcal)} kcal`
                  : '—'}
              </Text>
              <Text style={styles.hcInsightLine}>
                Total calories burned (this day):{' '}
                {healthConnectInsight.totalCaloriesBurnedDayKcal != null
                  ? `${Math.round(healthConnectInsight.totalCaloriesBurnedDayKcal)} kcal`
                  : '—'}
              </Text>
            </View>
          ) : null}
          {Platform.OS === 'ios' && iosHealthError ? (
            <Text style={styles.integrationError}>{iosHealthError}</Text>
          ) : null}
          {Platform.OS === 'android' && androidHealthHint ? (
            <Text style={styles.integrationHint}>{androidHealthHint}</Text>
          ) : null}
          {Platform.OS === 'ios' && appleHealthReadHint ? (
            <>
              <Text style={styles.integrationHint}>{appleHealthReadHint}</Text>
              <Pressable
                onPress={() => void openIosHealthApp()}
                style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
              >
                <Text style={styles.linkBtnText}>Open Health app</Text>
                <Icon name="heart-pulse" size={18} color={t.stepsTint} />
              </Pressable>
            </>
          ) : null}
          {Platform.OS === 'android' &&
          (androidStatus === 'needs_install' ||
            androidStatus === 'permission_denied' ||
            androidStatus === 'unavailable') ? (
            <Pressable
              onPress={() => openAndroidHealthSettings()}
              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            >
              <Text style={styles.linkBtnText}>Open Health Connect</Text>
              <Icon name="open-in-new" size={18} color={t.stepsTint} />
            </Pressable>
          ) : null}
          {Platform.OS === 'ios' && !healthOk ? (
            <Pressable
              onPress={() => void openIosHealthSettings()}
              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            >
              <Text style={styles.linkBtnText}>Open app settings</Text>
              <Icon name="cog-outline" size={18} color={t.stepsTint} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => void refresh()}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Icon name="sync" size={18} color={t.slate} />
            <Text style={styles.secondaryBtnText}>Sync now</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Log a session</Text>
          <Pressable
            onPress={() => setLogOpen(true)}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Icon name="plus" size={20} color={t.surface} />
            <Text style={styles.primaryBtnText}>Add workout</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>
          {isViewingToday ? "Today's workouts" : `Workouts · ${selectedDayLabel}`}
        </Text>
        <Text style={styles.sectionHint}>
          Newest first · same day as meals · includes health imports and manual entries
        </Text>

        {loading && combinedHistory.length === 0 ? (
          <View style={styles.loadRow}>
            <ActivityIndicator color={t.stepsTint} />
            <Text style={styles.loadLabel}>Loading history…</Text>
          </View>
        ) : null}

        {!loading && combinedHistory.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="run" size={36} color={t.muted} />
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptySub}>
              Pull to refresh after granting health permissions, or tap Add workout.
            </Text>
          </View>
        ) : null}

        {!loading && combinedHistory.length > 0 && sessionsForSelectedDay.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="calendar-blank-outline" size={36} color={t.muted} />
            <Text style={styles.emptyTitle}>No workouts this day</Text>
            <Text style={styles.emptySub}>
              Nothing logged or imported for {selectedDayLabel}. Try another date or add a workout.
            </Text>
          </View>
        ) : null}

        {sessionsForSelectedDay.map(row => (
          <HistoryCard
            key={row.id}
            row={row}
            timeLabel={formatSessionClock(row.startedAt)}
          />
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={logOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLogOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalScrim} onPress={() => setLogOpen(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Log workout</Text>
            <Text style={styles.modalHint}>Activity</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {ACTIVITIES.map(a => {
                const on = activity === a;
                return (
                  <Pressable
                    key={a}
                    onPress={() => setActivity(a)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{a}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.modalHint}>Duration (minutes)</Text>
            <TextInput
              value={durationText}
              onChangeText={setDurationText}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={t.muted}
              style={styles.input}
            />
            {Platform.OS === 'ios' ? (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Also save to Apple Health</Text>
                <Switch value={syncApple} onValueChange={setSyncApple} />
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setLogOpen(false)} style={styles.ghostBtn}>
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => onSaveManual().catch(() => {})}
                disabled={saving}
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: t.slate,
    letterSpacing: -0.6,
  },
  screenSub: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: t.muted,
    lineHeight: 20,
    marginBottom: 16,
  },
  pastHint: {
    fontSize: 13,
    fontWeight: '600',
    color: t.muted,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: t.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: t.border,
    shadowColor: t.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 14,
  },
  stepsPastCard: {
    backgroundColor: t.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: t.border,
    marginBottom: 14,
  },
  stepsPastEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: t.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepsPastBody: {
    fontSize: 14,
    fontWeight: '600',
    color: t.muted,
    lineHeight: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepsIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: t.stepsSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: t.stepsTint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroSteps: {
    fontSize: 32,
    fontWeight: '800',
    color: t.slate,
    letterSpacing: -1,
  },
  heroStepsUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: t.muted,
  },
  heroGoal: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: t.muted,
  },
  progressTrack: {
    marginTop: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: t.stepsTint,
  },
  integrationCard: {
    backgroundColor: t.accentSoft,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 20,
  },
  integrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  integrationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: t.slate,
  },
  integrationBody: {
    fontSize: 13,
    fontWeight: '600',
    color: t.muted,
    lineHeight: 19,
  },
  hcInsightBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9D5FF',
    gap: 6,
  },
  hcInsightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: t.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  hcInsightLine: {
    fontSize: 12,
    fontWeight: '600',
    color: t.muted,
    lineHeight: 17,
  },
  integrationError: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 17,
  },
  integrationHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    lineHeight: 17,
  },
  linkBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  linkBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: t.stepsTint,
  },
  secondaryBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: t.surface,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: t.border,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.slate,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: t.slate,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '600',
    color: t.muted,
    marginBottom: 12,
    marginTop: -4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.stepsTint,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: t.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
  },
  historyCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: t.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: t.border,
  },
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
    minWidth: 0,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: t.slate,
  },
  historyMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: t.muted,
  },
  historyPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  pill: {
    fontSize: 11,
    fontWeight: '700',
    color: t.muted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pillSource: {
    backgroundColor: '#ECFDF5',
    color: t.stepsTint,
  },
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: t.muted,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: t.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.border,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: t.slate,
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '600',
    color: t.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  modalSheet: {
    backgroundColor: t.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    paddingBottom: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: t.slate,
  },
  modalHint: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '700',
    color: t.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  chipOn: {
    backgroundColor: t.accentSoft,
    borderWidth: 1,
    borderColor: t.accent,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.muted,
  },
  chipTextOn: {
    color: t.accent,
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: t.slate,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: t.slate,
    flex: 1,
    paddingRight: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 22,
  },
  ghostBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  ghostBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: t.muted,
  },
  saveBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: t.stepsTint,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: t.surface,
  },
});
