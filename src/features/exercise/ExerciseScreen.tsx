import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeModules,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen } from '../../components/layout/Screen';
import { ScreenTopCard } from '../../components/screenTop';
import { upsertHealthDaySnapshot } from '../../services/healthDaySnapshots';
import { colors } from '../../theme/tokens';
import { startOfLocalDay } from '../water/waterDayUtils';

const AppleHealthKit = NativeModules.AppleHealthKit;

type HealthState = Readonly<{
  iosData: unknown;
  androidData: unknown;
  error: string | null;
}>;

const emptyHealthState: HealthState = {
  iosData: {},
  androidData: {},
  error: null,
};

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  return null;
}

function parseIosStepCount(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if ('error' in o || 'unavailable' in o) {
    return null;
  }
  return numOrNull(o.value);
}

function parseIosSamplesArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if ('error' in o || 'unavailable' in o) {
      return [];
    }
  }
  return [];
}

function avgHeartFromIosSamples(samples: unknown[]): number | null {
  let sum = 0;
  let n = 0;
  for (const s of samples) {
    if (s && typeof s === 'object' && 'value' in s) {
      const v = numOrNull((s as { value: unknown }).value);
      if (v !== null) {
        sum += v;
        n += 1;
      }
    }
  }
  return n > 0 ? Math.round(sum / n) : null;
}

function sumActiveEnergyIos(raw: unknown): number | null {
  const arr = parseIosSamplesArray(raw);
  let sum = 0;
  let n = 0;
  for (const s of arr) {
    if (s && typeof s === 'object' && 'value' in s) {
      const v = numOrNull((s as { value: unknown }).value);
      if (v !== null) {
        sum += v;
        n += 1;
      }
    }
  }
  return n > 0 ? Math.round(sum * 10) / 10 : null;
}

function workoutLabelIos(w: unknown): string {
  if (!w || typeof w !== 'object') {
    return 'Workout';
  }
  const o = w as Record<string, unknown>;
  const name = o.activityName ?? o.activityType ?? o.type;
  if (typeof name === 'string' && name.length > 0) {
    return name;
  }
  return 'Workout';
}

function workoutDurationMinutesIos(w: unknown): string | null {
  if (!w || typeof w !== 'object') {
    return null;
  }
  const o = w as Record<string, unknown>;
  const d = numOrNull(o.duration);
  if (d === null) {
    return null;
  }
  if (d > 24 * 60) {
    return `${Math.round(d / 60)} min`;
  }
  return `${Math.round(d)} min`;
}

function workoutTitleAndroid(w: unknown): string {
  if (!w || typeof w !== 'object') {
    return 'Workout';
  }
  const o = w as Record<string, unknown>;
  if (typeof o.title === 'string' && o.title.length > 0) {
    return o.title;
  }
  if (typeof o.exerciseType === 'number') {
    return `Activity ${o.exerciseType}`;
  }
  return 'Workout';
}

function workoutDurationAndroid(w: unknown): string | null {
  if (!w || typeof w !== 'object') {
    return null;
  }
  const o = w as { startTime?: string; endTime?: string };
  if (!o.startTime || !o.endTime) {
    return null;
  }
  const a = new Date(o.startTime).getTime();
  const b = new Date(o.endTime).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) {
    return null;
  }
  const min = Math.round((b - a) / 60000);
  return `${min} min`;
}

function readHcRecords(container: unknown): unknown[] {
  if (!container || typeof container !== 'object') {
    return [];
  }
  const o = container as { records?: unknown };
  if (!Array.isArray(o.records)) {
    return [];
  }
  return o.records;
}

function sumAndroidSteps(stepsBlock: unknown): number | null {
  const rows = readHcRecords(stepsBlock);
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    if (r && typeof r === 'object' && 'count' in r) {
      const c = numOrNull((r as { count: unknown }).count);
      if (c !== null) {
        sum += c;
        n += 1;
      }
    }
  }
  return n > 0 ? sum : null;
}

function avgHrAndroid(heartBlock: unknown): number | null {
  const rows = readHcRecords(heartBlock);
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    if (r && typeof r === 'object') {
      const samples = (r as { samples?: unknown[] }).samples;
      if (Array.isArray(samples)) {
        for (const s of samples) {
          if (s && typeof s === 'object' && 'beatsPerMinute' in s) {
            const b = numOrNull((s as { beatsPerMinute: unknown }).beatsPerMinute);
            if (b !== null) {
              sum += b;
              n += 1;
            }
          }
        }
      }
    }
  }
  return n > 0 ? Math.round(sum / n) : null;
}

function activeEnergyAndroid(exerciseBlock: unknown): number | null {
  const rows = readHcRecords(exerciseBlock);
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    if (r && typeof r === 'object' && 'totalEnergyBurned' in r) {
      const e = (r as { totalEnergyBurned?: { inKilocalories?: unknown } }).totalEnergyBurned;
      const kcal = e && typeof e === 'object' ? numOrNull(e.inKilocalories) : null;
      if (kcal !== null) {
        sum += kcal;
        n += 1;
      }
    }
  }
  return n > 0 ? Math.round(sum * 10) / 10 : null;
}

function workoutStableKey(w: unknown, idx: number): string {
  if (w && typeof w === 'object') {
    const o = w as Record<string, unknown>;
    const id = o.uuid ?? o.id;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
    const start =
      (typeof o.startDate === 'string' && o.startDate) ||
      (typeof o.startTime === 'string' && o.startTime) ||
      (typeof o.start === 'string' && o.start);
    if (typeof start === 'string' && start.length > 0) {
      return start;
    }
  }
  return `workout-${idx}`;
}

function workoutIconName(label: string): string {
  const n = label.toLowerCase();
  if (n.includes('run') || n.includes('jog')) {
    return 'run';
  }
  if (n.includes('walk')) {
    return 'walk';
  }
  if (n.includes('cycl') || n.includes('bike')) {
    return 'bike';
  }
  if (n.includes('swim')) {
    return 'swim';
  }
  if (n.includes('yoga')) {
    return 'yoga';
  }
  if (n.includes('pilates')) {
    return 'human-handsup';
  }
  if (n.includes('strength') || n.includes('weight') || n.includes('lift')) {
    return 'dumbbell';
  }
  if (n.includes('hiit') || n.includes('interval')) {
    return 'lightning-bolt';
  }
  if (n.includes('hike')) {
    return 'hiking';
  }
  if (n.includes('elliptical')) {
    return 'run-fast';
  }
  if (n.includes('row')) {
    return 'rowing';
  }
  if (n.includes('dance')) {
    return 'dance-ballroom';
  }
  if (n.includes('stair')) {
    return 'stairs';
  }
  if (n.includes('tennis')) {
    return 'tennis';
  }
  if (n.includes('soccer') || n.includes('football')) {
    return 'soccer';
  }
  if (n.includes('basketball')) {
    return 'basketball';
  }
  if (n.includes('golf')) {
    return 'golf';
  }
  if (n.includes('ski') || n.includes('snowboard')) {
    return 'ski-cross-country';
  }
  if (n.includes('boxing') || n.includes('kick')) {
    return 'boxing-glove';
  }
  if (n.includes('core') || n.includes('abs')) {
    return 'human';
  }
  return 'arm-flex';
}

const cardChrome = {
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: Readonly<{
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}>) {
  return (
    <View style={[styles.statCard, cardChrome]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${accent}18` }]}>
        <Icon name={icon} size={22} color={accent} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export function ExerciseScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDay, setSelectedDay] = useState(() => startOfLocalDay(new Date()));
  const activeDay = useMemo(() => startOfLocalDay(selectedDay), [selectedDay]);

  const [state, setState] = useState<HealthState>(emptyHealthState);
  const [loading, setLoading] = useState(false);
  const healthBootstrapDone = useRef(false);

  const selectDay = useCallback((d: Date) => {
    setSelectedDay(startOfLocalDay(d));
  }, []);

  const dayRange = useMemo(() => {
    const start = startOfLocalDay(activeDay);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start, end };
  }, [activeDay]);

  const bootstrapHealthAccess = useCallback(async () => {
    if (healthBootstrapDone.current) {
      return;
    }
    try {
      if (Platform.OS === 'ios' && AppleHealthKit?.initHealthKit) {
        await new Promise<void>(resolve => {
          AppleHealthKit.initHealthKit(
            {
              permissions: {
                read: ['StepCount', 'HeartRate', 'Workout', 'ActiveEnergyBurned'],
                write: ['Workout'],
              },
            },
            () => resolve(),
          );
        });
      } else if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        ]);
        const hc = await import('react-native-health-connect');
        await hc.initialize();
        await hc.requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'read', recordType: 'ExerciseSession' },
        ]);
      }
    } catch {
      /* silent — user can enable in system settings */
    } finally {
      healthBootstrapDone.current = true;
    }
  }, []);

  const fetchIOSData = useCallback(async () => {
    if (!AppleHealthKit) {
      return { error: 'HealthKit is not available on this build.' };
    }
    const options = {
      startDate: dayRange.start.toISOString(),
      endDate: dayRange.end.toISOString(),
      date: dayRange.start.toISOString(),
    };
    const runMethod = (methodName: string, methodOptions: Record<string, unknown>) =>
      new Promise<unknown>(resolve => {
        const fn = AppleHealthKit[methodName] as
          | ((opts: unknown, cb: (err: unknown, result: unknown) => void) => void)
          | undefined;
        if (!fn) {
          resolve({ unavailable: true });
          return;
        }
        fn(methodOptions, (err, result) => {
          resolve(err ? { error: errorText(err) } : result);
        });
      });
    return {
      selectedDay: dayRange.start.toISOString(),
      range: options,
      stepCount: await runMethod('getStepCount', { date: options.date }),
      heartRateSamples: await runMethod('getHeartRateSamples', options),
      workouts: await runMethod('getSamples', { ...options, type: 'Workout' }),
      activeEnergyBurned: await runMethod('getActiveEnergyBurned', options),
    };
  }, [dayRange.end, dayRange.start]);

  const fetchAndroidData = useCallback(async () => {
    try {
      const hc = await import('react-native-health-connect');
      await hc.initialize();
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: dayRange.start.toISOString(),
        endTime: dayRange.end.toISOString(),
      };
      const readRecord = async (recordType: string) => {
        try {
          return await hc.readRecords(recordType as never, { timeRangeFilter });
        } catch (e) {
          return { error: errorText(e) };
        }
      };
      const [steps, heartRate, exercise] = await Promise.all([
        readRecord('Steps'),
        readRecord('HeartRate'),
        readRecord('ExerciseSession'),
      ]);
      return {
        selectedDay: dayRange.start.toISOString(),
        timeRangeFilter,
        steps,
        heartRate,
        exercise,
      };
    } catch (e) {
      return { error: errorText(e) };
    }
  }, [dayRange.end, dayRange.start]);

  const backgroundSync = useCallback(
    (summary: {
      steps: number | null;
      energyKcal: number | null;
      avgHr: number | null;
      workoutCount: number;
      rawPlatform: unknown;
    }) => {
      const payload =
        Platform.OS === 'ios'
          ? { platform: 'ios', ios: summary.rawPlatform }
          : { platform: 'android', android: summary.rawPlatform };
      void upsertHealthDaySnapshot({
        day: activeDay,
        steps: summary.steps,
        activeEnergyKcal: summary.energyKcal,
        avgHeartRateBpm: summary.avgHr,
        workoutCount: summary.workoutCount,
        sleepSegmentsCount: 0,
        cycleLogCount: 0,
        payload,
      }).then(res => {
        if (!res.ok) {
          console.warn('[ExerciseScreen] Supabase sync:', res.error.message);
        }
      });
    },
    [activeDay],
  );

  const loadDay = useCallback(async () => {
    await bootstrapHealthAccess();
    setLoading(true);
    try {
      if (Platform.OS === 'ios') {
        const data = await fetchIOSData();
        if (data && typeof data === 'object' && 'error' in data) {
          setState(prev => ({
            ...prev,
            iosData: {},
            error: errorText((data as { error: unknown }).error),
          }));
          return;
        }
        setState(prev => ({ ...prev, iosData: data, error: null }));
        const d = data as Record<string, unknown>;
        const steps = parseIosStepCount(d.stepCount);
        const hrSamples = parseIosSamplesArray(d.heartRateSamples);
        const workouts = parseIosSamplesArray(d.workouts);
        const energy = sumActiveEnergyIos(d.activeEnergyBurned);
        backgroundSync({
          steps,
          energyKcal: energy,
          avgHr: avgHeartFromIosSamples(hrSamples),
          workoutCount: workouts.length,
          rawPlatform: d,
        });
      } else {
        const data = await fetchAndroidData();
        if (data && typeof data === 'object' && 'error' in data) {
          setState(prev => ({
            ...prev,
            androidData: {},
            error: errorText((data as { error: unknown }).error),
          }));
          return;
        }
        setState(prev => ({ ...prev, androidData: data, error: null }));
        const d = data as Record<string, unknown>;
        const steps = sumAndroidSteps(d.steps);
        const workouts = readHcRecords(d.exercise);
        backgroundSync({
          steps,
          energyKcal: activeEnergyAndroid(d.exercise),
          avgHr: avgHrAndroid(d.heartRate),
          workoutCount: workouts.length,
          rawPlatform: d,
        });
      }
    } catch (e) {
      setState(prev => ({ ...prev, error: errorText(e) }));
    } finally {
      setLoading(false);
    }
  }, [backgroundSync, bootstrapHealthAccess, fetchAndroidData, fetchIOSData]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  const summary = useMemo(() => {
    const isIos = Platform.OS === 'ios';
    if (isIos) {
      const d = state.iosData as Record<string, unknown>;
      if (!d || Object.keys(d).length === 0 || d.error) {
        return null;
      }
      const steps = parseIosStepCount(d.stepCount);
      const hrSamples = parseIosSamplesArray(d.heartRateSamples);
      const workouts = parseIosSamplesArray(d.workouts);
      const energy = sumActiveEnergyIos(d.activeEnergyBurned);
      return {
        steps,
        avgHr: avgHeartFromIosSamples(hrSamples),
        workoutCount: workouts.length,
        workouts,
        energyKcal: energy,
      };
    }
    const d = state.androidData as Record<string, unknown>;
    if (!d || Object.keys(d).length === 0 || d.error) {
      return null;
    }
    const steps = sumAndroidSteps(d.steps);
    const workouts = readHcRecords(d.exercise);
    return {
      steps,
      avgHr: avgHrAndroid(d.heartRate),
      workoutCount: workouts.length,
      workouts,
      energyKcal: activeEnergyAndroid(d.exercise),
    };
  }, [state.androidData, state.iosData]);

  const isIos = Platform.OS === 'ios';

  return (
    <Screen applyTopSafeArea={false} applyBottomSafeArea={false}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(28, insets.bottom + 20) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTopCard
          mode="date"
          selectedDay={activeDay}
          onSelectDay={selectDay}
          stripScope="scrollablePast"
        />

        {state.error ? <Text style={styles.bannerError}>{state.error}</Text> : null}

        {!summary && !loading ? (
          <Text style={styles.empty}>Allow health access in Settings to see this day.</Text>
        ) : null}

        {summary ? (
          <>
            <View style={styles.statGrid}>
              <StatCard
                icon="walk"
                label="Steps"
                value={summary.steps === null ? '—' : String(Math.round(summary.steps))}
                accent={colors.primary}
              />
              <StatCard
                icon="fire"
                label="Active energy"
                value={summary.energyKcal === null ? '—' : `${summary.energyKcal}`}
                sub={summary.energyKcal !== null ? 'kcal' : undefined}
                accent={colors.primary}
              />
              <StatCard
                icon="dumbbell"
                label="Workouts"
                value={String(summary.workoutCount)}
                sub="sessions"
                accent={colors.primary}
              />
              <StatCard
                icon="heart-pulse"
                label="Heart rate"
                value={summary.avgHr === null ? '—' : `${summary.avgHr}`}
                sub={summary.avgHr !== null ? 'bpm avg' : undefined}
                accent="#dc2626"
              />
            </View>

            <View style={[styles.panel, cardChrome]}>
              <View style={styles.panelHead}>
                <Icon name="format-list-bulleted" size={20} color={colors.primary} />
                <Text style={styles.panelTitle}>Workouts</Text>
              </View>
              {summary.workoutCount === 0 ? (
                <Text style={styles.panelMuted}>No workouts for this day.</Text>
              ) : (
                summary.workouts.slice(0, 16).map((w, idx) => {
                  const title = isIos ? workoutLabelIos(w) : workoutTitleAndroid(w);
                  const duration = isIos
                    ? workoutDurationMinutesIos(w)
                    : workoutDurationAndroid(w);
                  const wIcon = workoutIconName(title);
                  return (
                    <View key={workoutStableKey(w, idx)} style={styles.workoutRow}>
                      <View style={styles.workoutIconCircle}>
                        <Icon name={wIcon} size={22} color={colors.primary} />
                      </View>
                      <View style={styles.workoutTextCol}>
                        <Text style={styles.workoutTitle}>{title}</Text>
                        <Text style={styles.workoutMeta}>{duration ?? ' '}</Text>
                      </View>
                    </View>
                  );
                })
              )}
              {summary.workoutCount > 16 ? (
                <Text style={styles.panelMuted}>Showing first 16 of {summary.workoutCount}.</Text>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  bannerError: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    color: colors.error,
    fontWeight: '700',
    fontSize: 13,
  },
  empty: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  panel: {
    marginTop: 14,
    padding: 16,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  panelMuted: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  workoutIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workoutTextCol: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  workoutMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
});
