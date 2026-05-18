import {
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { startOfLocalDay } from '../features/water/waterDayUtils';

const AppleHealthKit = NativeModules.AppleHealthKit;

let healthBootstrapDone = false;

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  return null;
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

/** Matches Exercise screen: sums kcal from ExerciseSession records when present. */
function activeEnergyAndroid(exerciseBlock: unknown): number | null {
  const rows = readHcRecords(exerciseBlock);
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    if (r && typeof r === 'object' && 'totalEnergyBurned' in r) {
      const e = (r as { totalEnergyBurned?: { inKilocalories?: unknown } })
        .totalEnergyBurned;
      const kcal =
        e && typeof e === 'object' ? numOrNull(e.inKilocalories) : null;
      if (kcal !== null) {
        sum += kcal;
        n += 1;
      }
    }
  }
  return n > 0 ? Math.round(sum * 10) / 10 : null;
}

function localDayBounds(day: Date): Readonly<{ start: Date; end: Date }> {
  const start = startOfLocalDay(day);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { start, end };
}

async function bootstrapDeviceHealth(): Promise<void> {
  if (healthBootstrapDone) {
    return;
  }
  try {
    if (Platform.OS === 'ios' && AppleHealthKit?.initHealthKit) {
      await new Promise<void>(resolve => {
        AppleHealthKit.initHealthKit(
          {
            permissions: {
              read: [
                'StepCount',
                'HeartRate',
                'Workout',
                'ActiveEnergyBurned',
              ],
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
    /* user may deny — still attempt reads */
  } finally {
    healthBootstrapDone = true;
  }
}

async function fetchIosActiveEnergyRaw(day: Date): Promise<unknown> {
  if (!AppleHealthKit?.getActiveEnergyBurned) {
    return [];
  }
  const { start, end } = localDayBounds(day);
  const options = {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
  return new Promise<unknown>(resolve => {
    AppleHealthKit.getActiveEnergyBurned(
      options,
      (err: unknown, result: unknown) => {
        resolve(err ? { error: errorText(err) } : result);
      },
    );
  });
}

async function fetchAndroidExerciseForEnergy(day: Date): Promise<unknown> {
  try {
    const hc = await import('react-native-health-connect');
    await hc.initialize();
    const { start, end } = localDayBounds(day);
    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
    try {
      return await hc.readRecords('ExerciseSession' as never, {
        timeRangeFilter,
      });
    } catch (e) {
      return { error: errorText(e) };
    }
  } catch (e) {
    return { error: errorText(e) };
  }
}

/**
 * Active energy burned (kcal) for the given local calendar day from HealthKit /
 * Health Connect (Android: exercise-session kcal sum, same as Exercise tab).
 * Returns null if unavailable or denied.
 */
export async function fetchActiveEnergyKcalForLocalDay(
  day: Date,
): Promise<number | null> {
  await bootstrapDeviceHealth();
  try {
    if (Platform.OS === 'ios') {
      const raw = await fetchIosActiveEnergyRaw(day);
      if (
        raw &&
        typeof raw === 'object' &&
        'error' in raw &&
        typeof (raw as { error?: unknown }).error === 'string'
      ) {
        return null;
      }
      return sumActiveEnergyIos(raw);
    }
    const raw = await fetchAndroidExerciseForEnergy(day);
    if (raw && typeof raw === 'object' && 'error' in raw) {
      return null;
    }
    return activeEnergyAndroid(raw);
  } catch {
    return null;
  }
}
