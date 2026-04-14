import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { upsertHealthDaySnapshot } from '../../services/healthDaySnapshots';
import { colors } from '../../theme/tokens';
import { formatDayShort, startOfLocalDay } from '../water/waterDayUtils';

const AppleHealthKit = NativeModules.AppleHealthKit;

type ExerciseHistoryScreenProps = Readonly<{
  /** When omitted (e.g. drawer route), defaults to today in local time. */
  selectedDay?: Date;
}>;

type HealthState = Readonly<{
  iosData: unknown;
  androidData: unknown;
  androidPermissions: unknown;
  error: string | null;
}>;

const emptyHealthState: HealthState = {
  iosData: {},
  androidData: {},
  androidPermissions: {},
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

function StatTile({
  label,
  value,
  hint,
}: Readonly<{ label: string; value: string; hint?: string }>) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

export function ExerciseHistoryScreen({ selectedDay: selectedDayProp }: ExerciseHistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const activeDay = useMemo(
    () => startOfLocalDay(selectedDayProp ?? new Date()),
    [selectedDayProp],
  );

  const [state, setState] = useState<HealthState>(emptyHealthState);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [lastSyncedOk, setLastSyncedOk] = useState<boolean | null>(null);

  const dayRange = useMemo(() => {
    const start = startOfLocalDay(activeDay);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start, end };
  }, [activeDay]);

  const requestIOSPermissions = useCallback(() => {
    return new Promise<{ success: boolean; error?: string }>(resolve => {
      if (!AppleHealthKit?.initHealthKit) {
        resolve({ success: false, error: 'HealthKit is not available on this build.' });
        return;
      }
      const permissions = {
        permissions: {
          read: ['StepCount', 'HeartRate', 'Workout', 'SleepAnalysis', 'ActiveEnergyBurned'],
          write: ['Workout'],
        },
      };
      AppleHealthKit.initHealthKit(permissions, (err: unknown) => {
        if (err) {
          resolve({ success: false, error: errorText(err) });
          return;
        }
        resolve({ success: true });
      });
    });
  }, []);

  const requestAndroidPermissions = useCallback(async () => {
    try {
      return await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
      ]);
    } catch (e) {
      return { error: errorText(e) };
    }
  }, []);

  const requestHealthConnectPermissions = useCallback(async () => {
    try {
      const hc = await import('react-native-health-connect');
      await hc.initialize();
      await hc.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'ExerciseSession' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'MenstruationPeriod' },
        { accessType: 'read', recordType: 'MenstruationFlow' },
      ]);
      return await hc.getGrantedPermissions();
    } catch (e) {
      return { error: errorText(e) };
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    setRequesting(true);
    try {
      if (Platform.OS === 'ios') {
        const res = await requestIOSPermissions();
        if (!res.success) {
          Alert.alert('Health permission needed', res.error ?? 'Please allow access in the Health app.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ]);
        }
      } else {
        const perms = await requestAndroidPermissions();
        const hcPerms = await requestHealthConnectPermissions();
        setState(prev => ({
          ...prev,
          androidPermissions: perms,
          androidData: hcPerms,
        }));
      }
    } catch (e) {
      setState(prev => ({ ...prev, error: errorText(e) }));
    } finally {
      setRequesting(false);
    }
  }, [requestAndroidPermissions, requestHealthConnectPermissions, requestIOSPermissions]);

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
      sleepPeriods: await runMethod('getSamples', { ...options, type: 'SleepAnalysis' }),
      menstrualPeriods: await runMethod('getSamples', { ...options, type: 'MenstrualFlow' }),
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
      const [steps, heartRate, exercise, sleep, menstruationPeriod, menstruationFlow] =
        await Promise.all([
          readRecord('Steps'),
          readRecord('HeartRate'),
          readRecord('ExerciseSession'),
          readRecord('SleepSession'),
          readRecord('MenstruationPeriod'),
          readRecord('MenstruationFlow'),
        ]);
      return {
        selectedDay: dayRange.start.toISOString(),
        timeRangeFilter,
        steps,
        heartRate,
        exercise,
        sleep,
        menstruationPeriod,
        menstruationFlow,
      };
    } catch (e) {
      return { error: errorText(e) };
    }
  }, [dayRange.end, dayRange.start]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'ios') {
        const data = await fetchIOSData();
        setState(prev => ({ ...prev, iosData: data, error: null }));
      } else {
        const data = await fetchAndroidData();
        setState(prev => ({ ...prev, androidData: data, error: null }));
      }
      setLastFetchedAt(new Date().toISOString());
      setLastSyncedOk(null);
    } catch (e) {
      setState(prev => ({ ...prev, error: errorText(e) }));
    } finally {
      setLoading(false);
    }
  }, [fetchAndroidData, fetchIOSData]);

  useEffect(() => {
    void requestPermissions();
  }, [requestPermissions]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, activeDay]);

  const summary = useMemo(() => {
    if (Platform.OS === 'ios') {
      const d = state.iosData as Record<string, unknown>;
      if (d.error) {
        return null;
      }
      const steps = parseIosStepCount(d.stepCount);
      const hrSamples = parseIosSamplesArray(d.heartRateSamples);
      const workouts = parseIosSamplesArray(d.workouts);
      const sleep = parseIosSamplesArray(d.sleepPeriods);
      const cycle = parseIosSamplesArray(d.menstrualPeriods);
      const energy = sumActiveEnergyIos(d.activeEnergyBurned);
      return {
        steps,
        avgHr: avgHeartFromIosSamples(hrSamples),
        workoutCount: workouts.length,
        workouts,
        sleepCount: sleep.length,
        cycleCount: cycle.length,
        energyKcal: energy,
        rawPlatform: d,
      };
    }
    const d = state.androidData as Record<string, unknown>;
    if (d.error) {
      return null;
    }
    const steps = sumAndroidSteps(d.steps);
    const workouts = readHcRecords(d.exercise);
    const sleep = readHcRecords(d.sleep);
    const cycleFlow = readHcRecords(d.menstruationFlow);
    const cyclePeriod = readHcRecords(d.menstruationPeriod);
    return {
      steps,
      avgHr: avgHrAndroid(d.heartRate),
      workoutCount: workouts.length,
      workouts,
      sleepCount: sleep.length,
      cycleCount: cycleFlow.length + cyclePeriod.length,
      energyKcal: activeEnergyAndroid(d.exercise),
      rawPlatform: d,
    };
  }, [state.androidData, state.iosData]);

  const syncToCloud = useCallback(async () => {
    if (!summary) {
      Alert.alert('Nothing to save', 'Load health data first, then try again.');
      return;
    }
    setSyncing(true);
    setLastSyncedOk(null);
    const payload =
      Platform.OS === 'ios'
        ? { platform: 'ios', ios: summary.rawPlatform }
        : { platform: 'android', android: summary.rawPlatform };

    const res = await upsertHealthDaySnapshot({
      day: activeDay,
      steps: summary.steps,
      activeEnergyKcal: summary.energyKcal,
      avgHeartRateBpm: summary.avgHr,
      workoutCount: summary.workoutCount,
      sleepSegmentsCount: summary.sleepCount,
      cycleLogCount: summary.cycleCount,
      payload,
    });
    setSyncing(false);
    if (!res.ok) {
      setLastSyncedOk(false);
      Alert.alert('Could not save', res.error.message);
      return;
    }
    setLastSyncedOk(true);
  }, [activeDay, summary]);

  const dayTitle = formatDayShort(activeDay);
  const isIos = Platform.OS === 'ios';

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(32, insets.bottom + 20) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Exercise</Text>
          <Text style={styles.heroTitle}>{dayTitle}</Text>
          <Text style={styles.heroSub}>
            Movement, workouts, and recovery for this day. Data comes from Apple Health or Health
            Connect.
          </Text>
          {lastFetchedAt ? (
            <Text style={styles.heroMeta}>Updated {new Date(lastFetchedAt).toLocaleString()}</Text>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, styles.actionSecondary]}
            onPress={() => void requestPermissions()}
            disabled={requesting}
          >
            <Text style={styles.actionSecondaryText}>
              {requesting ? 'Permissions…' : 'Permissions'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={() => void fetchData()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.actionPrimaryText}>Refresh</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionCloud]}
            onPress={() => void syncToCloud()}
            disabled={syncing || loading}
          >
            {syncing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.actionCloudText}>Save day</Text>
            )}
          </Pressable>
        </View>
        {lastSyncedOk === true ? (
          <Text style={styles.syncOk}>Saved to your HealthFirst account.</Text>
        ) : null}
        {lastSyncedOk === false ? (
          <Text style={styles.syncBad}>Save failed. Run the SQL in Supabase if the table is missing.</Text>
        ) : null}

        {state.error ? <Text style={styles.bannerError}>{state.error}</Text> : null}

        {!summary && !loading ? (
          <Text style={styles.empty}>No summary yet. Tap Refresh after allowing health access.</Text>
        ) : null}

        {summary ? (
          <>
            <View style={styles.statGrid}>
              <StatTile
                label="Steps"
                value={summary.steps === null ? '—' : String(Math.round(summary.steps))}
              />
              <StatTile
                label="Active energy"
                value={summary.energyKcal === null ? '—' : `${summary.energyKcal} kcal`}
              />
              <StatTile
                label="Workouts"
                value={String(summary.workoutCount)}
                hint="Sessions this day"
              />
              <StatTile
                label="Heart rate"
                value={summary.avgHr === null ? '—' : `${summary.avgHr} bpm avg`}
              />
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Sleep & wellbeing</Text>
              <Text style={styles.panelBody}>
                Sleep segments logged: {summary.sleepCount}. Cycle-related entries:{' '}
                {summary.cycleCount}.
              </Text>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Workouts</Text>
              {summary.workoutCount === 0 ? (
                <Text style={styles.panelMuted}>No workouts recorded for this day.</Text>
              ) : (
                summary.workouts.slice(0, 12).map((w, idx) => (
                  <View key={workoutStableKey(w, idx)} style={styles.workoutRow}>
                    <View style={styles.workoutDot} />
                    <View style={styles.workoutTextCol}>
                      <Text style={styles.workoutTitle}>
                        {isIos ? workoutLabelIos(w) : workoutTitleAndroid(w)}
                      </Text>
                      <Text style={styles.workoutMeta}>
                        {isIos
                          ? workoutDurationMinutesIos(w) ?? ' '
                          : workoutDurationAndroid(w) ?? ' '}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              {summary.workoutCount > 12 ? (
                <Text style={styles.panelMuted}>Showing first 12 of {summary.workoutCount}.</Text>
              ) : null}
            </View>
          </>
        ) : null}

        {Platform.OS === 'android' && state.androidPermissions ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Permissions (debug)</Text>
            <Text style={styles.monoSmall}>{JSON.stringify(state.androidPermissions, null, 2)}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  hero: {
    marginBottom: 8,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  heroMeta: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    marginBottom: 6,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: colors.primary,
    flexGrow: 1,
  },
  actionPrimaryText: {
    color: colors.surface,
    fontWeight: '800',
    fontSize: 14,
  },
  actionSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionSecondaryText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  actionCloud: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    flexGrow: 1,
  },
  actionCloudText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  syncOk: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  syncBad: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  bannerError: {
    marginTop: 10,
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
  },
  statGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statHint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  panel: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  panelBody: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  panelMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  workoutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
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
  monoSmall: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    color: colors.textSecondary,
  },
});
