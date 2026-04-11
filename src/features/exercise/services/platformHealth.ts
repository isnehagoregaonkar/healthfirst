import { Linking, NativeModules, Platform } from 'react-native';
import type { ExerciseSessionRow } from '../exerciseTypes';

export type HealthConnectStatus = 'unavailable' | 'needs_install' | 'ready';

type IosWorkoutDict = Readonly<{
  id?: string;
  activityName?: string;
  start?: string;
  end?: string;
  duration?: number;
  calories?: number;
  distance?: number;
  sourceName?: string;
  device?: string;
}>;

/** `react-native-health` uses `module.exports = HealthKit` — Metro often leaves `.default` undefined. */
type IosHealthKitModule = {
  initHealthKit: (
    p: { permissions: { read: string[]; write: string[] } },
    cb: (err: string) => void,
  ) => void;
  getStepCount: (
    o: { date?: string; startDate?: string; endDate?: string; includeManuallyAdded?: boolean },
    cb: (err: string, r: { value?: number }) => void,
  ) => void;
  getSamples: (
    o: {
      type: string;
      startDate: string;
      endDate: string;
      limit?: number;
      ascending?: boolean;
    },
    cb: (err: unknown, results?: IosWorkoutDict[]) => void,
  ) => void;
  getAnchoredWorkouts: (
    o: { startDate: string; endDate: string; limit?: number },
    cb: (err: unknown, r?: { data?: IosWorkoutDict[] }) => void,
  ) => void;
  getDailyStepCountSamples?: (
    o: {
      startDate: string;
      endDate: string;
      period?: number;
      includeManuallyAdded?: boolean;
    },
    cb: (err: unknown, results?: ReadonlyArray<{ value?: number }>) => void,
  ) => void;
  saveWorkout: (
    o: {
      type: string;
      startDate: string;
      endDate: string;
      energyBurned?: number;
      energyBurnedUnit?: string;
    },
    cb: (err: string) => void,
  ) => void;
  Constants: {
    Permissions: Record<string, string>;
    Activities: Record<string, string>;
  };
  isAvailable?: (
    cb: (err: unknown, available?: boolean) => void,
  ) => void;
};

type HkConstants = IosHealthKitModule['Constants'];

let hkConstantsCache: HkConstants | null = null;

function loadHealthKitConstants(): HkConstants | null {
  if (hkConstantsCache) {
    return hkConstantsCache;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const legacy = require('react-native-health') as { Constants?: HkConstants };
    if (legacy.Constants?.Permissions?.Steps) {
      hkConstantsCache = legacy.Constants;
      return hkConstantsCache;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Read `NativeModules.AppleHealthKit` on each call. `react-native-health` binds
 * NativeModules at package load time; on RN 0.76+ that snapshot is often empty,
 * so `initHealthKit` never appears unless we merge lazily.
 */
function getIosHealthKit(): IosHealthKitModule | null {
  if (Platform.OS !== 'ios') {
    return null;
  }
  const constants = loadHealthKitConstants();
  if (!constants?.Permissions?.Steps) {
    return null;
  }
  const native = NativeModules.AppleHealthKit as
    | Partial<IosHealthKitModule>
    | undefined;
  if (!native || typeof native.initHealthKit !== 'function') {
    return null;
  }
  return {
    ...native,
    Constants: constants,
  } as IosHealthKitModule;
}

export async function openIosHealthSettings(): Promise<void> {
  if (Platform.OS === 'ios') {
    await Linking.openSettings();
  }
}

function dayBounds(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  return { start, end };
}

/** Exclusive end of local calendar day after `dayStart` (midnight next day). */
function endOfLocalDayAfter(dayStart: Date): Date {
  const x = new Date(dayStart);
  x.setDate(x.getDate() + 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Upper bound for step queries: now, or end of that local day if in the past. */
function stepSampleQueryEnd(dayStart: Date): Date {
  const dayEnd = endOfLocalDayAfter(dayStart);
  const now = new Date();
  return now.getTime() < dayEnd.getTime() ? now : dayEnd;
}

function formatHealthKitInitError(err: unknown): string {
  if (err == null) {
    return '';
  }
  if (typeof err === 'string') {
    return err;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: string }).message;
    if (typeof m === 'string' && m.length > 0) {
      return m;
    }
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function promisifyIsHealthDataAvailable(): Promise<boolean> {
  return new Promise(resolve => {
    const HealthKit = getIosHealthKit();
    if (!HealthKit?.isAvailable) {
      resolve(true);
      return;
    }
    try {
      HealthKit.isAvailable((err: unknown, available?: boolean) => {
        if (err != null || available == null) {
          resolve(true);
        } else {
          resolve(!!available);
        }
      });
    } catch {
      resolve(true);
    }
  });
}

function promisifyInitHealthKit(): Promise<{ ok: boolean; error?: string }> {
  return new Promise(resolve => {
    const HealthKit = getIosHealthKit();
    if (!HealthKit) {
      resolve({
        ok: false,
        error:
          'Apple Health native module is missing. Run `cd ios && pod install`, then rebuild from Xcode.',
      });
      return;
    }
    try {
      const P = HealthKit.Constants.Permissions;
      HealthKit.initHealthKit(
        {
          permissions: {
            read: [
              P.Steps,
              P.StepCount,
              P.Workout,
              P.ActiveEnergyBurned,
              P.DistanceWalkingRunning,
              P.AppleExerciseTime,
            ],
            write: [P.Workout],
          },
        },
        (err: unknown) => {
          if (err != null) {
            resolve({ ok: false, error: formatHealthKitInitError(err) });
            return;
          }
          resolve({ ok: true });
        },
      );
    } catch (e) {
      resolve({ ok: false, error: formatHealthKitInitError(e) });
    }
  });
}

function promisifyGetStepCount(day: Date): Promise<number> {
  return new Promise(resolve => {
    const HealthKit = getIosHealthKit();
    if (!HealthKit) {
      resolve(0);
      return;
    }
    try {
      HealthKit.getStepCount(
        { date: day.toISOString(), includeManuallyAdded: true },
        (err: unknown, r: { value?: number }) => {
          if (err != null || r?.value == null || Number.isNaN(r.value)) {
            resolve(0);
          } else {
            resolve(Math.round(r.value));
          }
        },
      );
    } catch {
      resolve(0);
    }
  });
}

/** Sums 60‑minute buckets (matches Watch/iPhone step aggregation better in some cases). */
function promisifyDailyStepBucketSum(
  dayStart: Date,
  queryEnd: Date,
): Promise<number> {
  return new Promise(resolve => {
    const HealthKit = getIosHealthKit();
    if (!HealthKit?.getDailyStepCountSamples) {
      resolve(0);
      return;
    }
    if (queryEnd.getTime() <= dayStart.getTime()) {
      resolve(0);
      return;
    }
    try {
      HealthKit.getDailyStepCountSamples(
        {
          startDate: dayStart.toISOString(),
          endDate: queryEnd.toISOString(),
          period: 60,
          includeManuallyAdded: true,
        },
        (err: unknown, results?: ReadonlyArray<{ value?: number }>) => {
          if (err != null || !Array.isArray(results)) {
            resolve(0);
            return;
          }
          let sum = 0;
          for (const row of results) {
            const v = row?.value;
            if (typeof v === 'number' && Number.isFinite(v)) {
              sum += v;
            }
          }
          resolve(Math.round(sum));
        },
      );
    } catch {
      resolve(0);
    }
  });
}

async function resolveStepsForLocalDay(dayStart: Date): Promise<number> {
  const fromStats = await promisifyGetStepCount(dayStart);
  const fromBuckets = await promisifyDailyStepBucketSum(
    dayStart,
    stepSampleQueryEnd(dayStart),
  );
  return Math.max(fromStats, fromBuckets);
}

function promisifyWorkoutSamples(
  start: Date,
  end: Date,
  limit: number,
): Promise<IosWorkoutDict[]> {
  return new Promise(resolve => {
    const HealthKit = getIosHealthKit();
    if (!HealthKit?.getSamples) {
      resolve([]);
      return;
    }
    try {
      HealthKit.getSamples(
        {
          type: 'Workout',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          limit,
          ascending: false,
        },
        (err: unknown, results?: IosWorkoutDict[]) => {
          if (err || !Array.isArray(results)) {
            resolve([]);
          } else {
            resolve(results);
          }
        },
      );
    } catch {
      resolve([]);
    }
  });
}

function iosWorkoutRichness(w: IosWorkoutDict): number {
  let s = 0;
  if (typeof w.duration === 'number' && w.duration > 0) {
    s += 2;
  }
  if (typeof w.calories === 'number' && w.calories > 0) {
    s += 1;
  }
  if (typeof w.distance === 'number' && w.distance > 0) {
    s += 1;
  }
  if (w.sourceName?.trim()) {
    s += 0.5;
  }
  return s;
}

function mergeIosWorkoutDicts(
  a: IosWorkoutDict[],
  b: IosWorkoutDict[],
): IosWorkoutDict[] {
  const map = new Map<string, IosWorkoutDict>();
  for (const w of [...a, ...b]) {
    const id = w.id;
    if (!id) {
      continue;
    }
    const existing = map.get(id);
    const chosen =
      !existing || iosWorkoutRichness(w) > iosWorkoutRichness(existing)
        ? w
        : existing;
    map.set(id, chosen);
  }
  return [...map.values()].sort(
    (x, y) =>
      new Date(y.end ?? 0).getTime() - new Date(x.end ?? 0).getTime(),
  );
}

function iosDeviceLabel(w: IosWorkoutDict): string | undefined {
  const d = (w.device ?? '').toLowerCase();
  if (d.includes('watch')) {
    return 'Apple Watch';
  }
  if (d.includes('iphone')) {
    return 'iPhone';
  }
  const src = w.sourceName?.trim();
  if (src && src.length > 0) {
    return src;
  }
  return undefined;
}

function promisifyAnchoredWorkouts(
  start: Date,
  end: Date,
): Promise<IosWorkoutDict[]> {
  return new Promise(resolve => {
    const HealthKit = getIosHealthKit();
    if (!HealthKit) {
      resolve([]);
      return;
    }
    try {
      HealthKit.getAnchoredWorkouts(
        {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          limit: 200,
        },
        (err: unknown, r?: { data?: IosWorkoutDict[] }) => {
          if (err || !r?.data) {
            resolve([]);
          } else {
            resolve(r.data);
          }
        },
      );
    } catch {
      resolve([]);
    }
  });
}

function mapIosWorkouts(rows: IosWorkoutDict[]): ExerciseSessionRow[] {
  const MILES_TO_KM = 1.60934;
  return rows
    .filter(w => w.id && w.start && w.end)
    .map(w => {
      const start = w.start!;
      const end = w.end!;
      const startMs = new Date(start).getTime();
      const endMs = new Date(end).getTime();
      const fromIntervalSec =
        Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
          ? (endMs - startMs) / 1000
          : 0;
      const durSec =
        typeof w.duration === 'number' && w.duration > 0
          ? w.duration
          : fromIntervalSec;
      const durationMin = Math.max(1, Math.round(durSec / 60));
      const distMi = typeof w.distance === 'number' ? w.distance : 0;
      const deviceLabel = iosDeviceLabel(w);
      return {
        id: `hk-${w.id}`,
        source: 'apple_health' as const,
        title: w.activityName?.trim() || 'Workout',
        startedAt: start,
        endedAt: end,
        durationMin,
        calories:
          typeof w.calories === 'number' && w.calories > 0
            ? Math.round(w.calories)
            : undefined,
        distanceKm: distMi > 0 ? Math.round(distMi * MILES_TO_KM * 10) / 10 : undefined,
        ...(deviceLabel ? { deviceLabel } : {}),
      };
    });
}

/** iOS: request HealthKit access and return today's step count + recent workouts. */
export async function fetchIosHealthSnapshot(): Promise<{
  ok: boolean;
  stepsToday: number;
  workouts: ExerciseSessionRow[];
  errorMessage?: string;
}> {
  if (Platform.OS !== 'ios') {
    return { ok: false, stepsToday: 0, workouts: [] };
  }
  if (!getIosHealthKit()) {
    return {
      ok: false,
      stepsToday: 0,
      workouts: [],
      errorMessage:
        'Could not load Apple Health. Rebuild the iOS app after `pod install`.',
    };
  }
  const available = await promisifyIsHealthDataAvailable();
  if (!available) {
    return {
      ok: false,
      stepsToday: 0,
      workouts: [],
      errorMessage:
        'Health data is not available on this device (e.g. some simulators or iPad models).',
    };
  }
  const init = await promisifyInitHealthKit();
  if (!init.ok) {
    return {
      ok: false,
      stepsToday: 0,
      workouts: [],
      errorMessage: init.error,
    };
  }
  const { start } = dayBounds();
  const stepsToday = await resolveStepsForLocalDay(start);
  const histStart = new Date();
  histStart.setDate(histStart.getDate() - 90);
  histStart.setHours(0, 0, 0, 0);
  const queryStart = new Date(histStart.getTime() - 24 * 60 * 60 * 1000);
  const endNow = new Date();
  const [anchored, samples] = await Promise.all([
    promisifyAnchoredWorkouts(queryStart, endNow),
    promisifyWorkoutSamples(queryStart, endNow, 250),
  ]);
  const merged = mergeIosWorkoutDicts(anchored, samples);
  const workouts = mapIosWorkouts(merged);
  return { ok: true, stepsToday, workouts };
}

/** Android Health Connect: initialize + permissions + aggregate steps + sessions. */
export async function fetchAndroidHealthSnapshot(): Promise<{
  ok: boolean;
  status: HealthConnectStatus;
  stepsToday: number;
  workouts: ExerciseSessionRow[];
}> {
  if (Platform.OS !== 'android') {
    return { ok: false, status: 'unavailable', stepsToday: 0, workouts: [] };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const HC = require('react-native-health-connect') as typeof import('react-native-health-connect');
    const sdk = await HC.getSdkStatus();
    if (sdk !== HC.SdkAvailabilityStatus.SDK_AVAILABLE) {
      return {
        ok: false,
        status: 'needs_install',
        stepsToday: 0,
        workouts: [],
      };
    }
    const inited = await HC.initialize();
    if (!inited) {
      return { ok: false, status: 'unavailable', stepsToday: 0, workouts: [] };
    }
    await HC.requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'ExerciseSession' },
      { accessType: 'write', recordType: 'Steps' },
      { accessType: 'write', recordType: 'ExerciseSession' },
    ]);
    const { start, end } = dayBounds();
    const agg = await HC.aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
    const stepsToday =
      agg && typeof agg === 'object' && 'COUNT_TOTAL' in agg
        ? Math.round(Number((agg as { COUNT_TOTAL: number }).COUNT_TOTAL) || 0)
        : 0;

    const histStart = new Date();
    histStart.setDate(histStart.getDate() - 21);
    const { records } = await HC.readRecords('ExerciseSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: histStart.toISOString(),
        endTime: end.toISOString(),
      },
      ascendingOrder: false,
      pageSize: 60,
    });

    const workouts: ExerciseSessionRow[] = (records ?? []).map(
      (rec: {
        metadata?: { id?: string };
        startTime: string;
        endTime: string;
        title?: string;
        exerciseType?: number;
      }) => {
        const startT = rec.startTime;
        const endT = rec.endTime;
        const ms = new Date(endT).getTime() - new Date(startT).getTime();
        const durationMin = Math.max(1, Math.round(ms / 60_000));
        const id =
          rec.metadata?.id ??
          `hc-${startT}-${String(rec.exerciseType ?? 0)}`;
        return {
          id,
          source: 'health_connect' as const,
          title: rec.title?.trim() || 'Exercise session',
          startedAt: startT,
          endedAt: endT,
          durationMin,
        };
      },
    );

    return { ok: true, status: 'ready', stepsToday, workouts };
  } catch {
    return { ok: false, status: 'unavailable', stepsToday: 0, workouts: [] };
  }
}

export async function openAndroidHealthSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const HC = require('react-native-health-connect') as typeof import('react-native-health-connect');
    HC.openHealthConnectSettings();
  } catch {
    /* ignore */
  }
}

export async function saveManualWorkoutToAppleHealth(
  durationMin: number,
  startedAt: Date,
  activityName: string,
): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }
  const init = await promisifyInitHealthKit();
  if (!init.ok) {
    return false;
  }
  const end = new Date(startedAt.getTime() + durationMin * 60_000);
  return new Promise(resolve => {
    const HealthKit = getIosHealthKit();
    if (!HealthKit) {
      resolve(false);
      return;
    }
    try {
      const type =
        activityName.toLowerCase().includes('run')
          ? HealthKit.Constants.Activities.Running
          : activityName.toLowerCase().includes('cycle')
            ? HealthKit.Constants.Activities.Cycling
            : activityName.toLowerCase().includes('walk')
              ? HealthKit.Constants.Activities.Walking
              : HealthKit.Constants.Activities.Other;
      HealthKit.saveWorkout(
        {
          type,
          startDate: startedAt.toISOString(),
          endDate: end.toISOString(),
        },
        (err: string) => resolve(!err),
      );
    } catch {
      resolve(false);
    }
  });
}
