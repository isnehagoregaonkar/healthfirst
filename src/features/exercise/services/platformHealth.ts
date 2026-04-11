import { Linking, NativeModules, Platform } from 'react-native';
import type { ExerciseSessionRow } from '../exerciseTypes';

export type HealthConnectStatus = 'unavailable' | 'needs_install' | 'ready';

/**
 * Native `RCTResponseSenderBlock` passes one `NSArray`; the bridge usually
 * spreads it to `(err, result)`, but some RN paths deliver a **single** argument
 * that is the array `[err, result]`. If we treat that array as `err`, it is truthy
 * and we incorrectly discard all HealthKit results (e.g. steps always 0).
 */
function unwrapHkResponseArgs(args: unknown[]): [unknown, unknown] {
  if (args.length === 1 && Array.isArray(args[0])) {
    const inner = args[0] as unknown[];
    return [inner[0], inner[1]];
  }
  return [args[0], args[1]];
}

function hkCallbackFailed(err: unknown): boolean {
  return err != null && err !== false;
}

/**
 * HKAuthorizationStatus from `authorizationStatusForType:`.
 * Apple often returns `notDetermined` for **read** types even when the user turned data on in
 * Health → Apps — the OS does not expose read-granted vs not for privacy.
 */
function hkAuthStatusMeaning(code: number): string {
  switch (code) {
    case 0:
      return 'notDetermined';
    case 1:
      return 'sharingDenied';
    case 2:
      return 'sharingAuthorized';
    default:
      return `unknown(${code})`;
  }
}

/** Verbose Apple Health / HealthKit logs — only when `__DEV__` is true (Metro / Xcode console). */
function hkDebugLog(tag: string, data: unknown): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return;
  }
  try {
    const seen = new WeakSet<object>();
    const json = JSON.stringify(
      data,
      (_key, value) => {
        if (typeof value === 'bigint') {
          return String(value);
        }
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value as object)) {
            return '[Circular]';
          }
          seen.add(value as object);
        }
        return value;
      },
      2,
    );
    // eslint-disable-next-line no-console
    console.log(`[HealthFirst][AppleHealth] ${tag}`, json);
  } catch {
    // eslint-disable-next-line no-console
    console.log(`[HealthFirst][AppleHealth] ${tag}`, data);
  }
}

function hkDebugLogCallbackArgs(tag: string, cbArgs: unknown[]): void {
  hkDebugLog(`${tag} — raw callback argument count`, { length: cbArgs.length });
  cbArgs.forEach((arg, i) => {
    hkDebugLog(`${tag} — callback arg[${i}]`, arg);
  });
}

/**
 * FIX #1: Use midnight (start of day) instead of noon.
 * The native `getStepCount` uses this date to determine which calendar day to
 * aggregate — passing noon can cause off-by-one errors in some timezones.
 */
function isoMidnightLocalForDay(dayStart: Date): string {
  const d = new Date(dayStart);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

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
    o: {
      date?: string;
      startDate?: string;
      endDate?: string;
      includeManuallyAdded?: boolean;
    },
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
  /** Parallel arrays: same order as `permissions.read` / `permissions.write` in the input. Values are HKAuthorizationStatus (0–2). */
  getAuthStatus: (
    input: { permissions: { read: string[]; write: string[] } },
    cb: (
      err: unknown,
      r?: { permissions: { read: number[]; write: number[] } },
    ) => void,
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
  isAvailable?: (cb: (err: unknown, available?: boolean) => void) => void;
};

type HkConstants = IosHealthKitModule['Constants'];

let hkConstantsCache: HkConstants | null = null;

function loadHealthKitConstants(): HkConstants | null {
  if (hkConstantsCache) {
    return hkConstantsCache;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const legacy = require('react-native-health') as {
      Constants?: HkConstants;
    };
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

/** Opens the Health app so the user can go to Profile → Apps → HealthFirst. */
export async function openIosHealthApp(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }
  try {
    await Linking.openURL('x-apple-health://');
  } catch {
    /* ignore */
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
      hkDebugLog(
        'isAvailable — method missing on module, assuming available',
        {},
      );
      resolve(true);
      return;
    }
    try {
      HealthKit.isAvailable((...cbArgs: unknown[]) => {
        hkDebugLogCallbackArgs('isAvailable', cbArgs);
        const [err, available] = unwrapHkResponseArgs(cbArgs);
        hkDebugLog('isAvailable — unwrapped', { err, available });
        if (hkCallbackFailed(err) || available == null) {
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

/**
 * FIX #4: Log resolved permission constant values so you can verify none are undefined.
 * If any value is undefined, that permission is silently dropped and HealthKit never
 * prompts the user for it — causing empty data.
 */
function buildIosHealthKitPermissionPayload(): {
  permissions: { read: string[]; write: string[] };
} | null {
  const HealthKit = getIosHealthKit();
  if (!HealthKit) {
    return null;
  }

  // DEBUG: Log all resolved constant values — catch undefined keys early.
  hkDebugLog(
    'buildPermissionPayload — Constants.Permissions (all keys)',
    HealthKit.Constants.Permissions,
  );
  hkDebugLog('buildPermissionPayload — resolved permission values', {
    Steps: HealthKit.Constants.Permissions.Steps,
    Workout: HealthKit.Constants.Permissions.Workout,
    ActiveEnergyBurned: HealthKit.Constants.Permissions.ActiveEnergyBurned,
    DistanceWalkingRunning:
      HealthKit.Constants.Permissions.DistanceWalkingRunning,
  });

  const readPerms = [
    HealthKit.Constants.Permissions.Steps,
    HealthKit.Constants.Permissions.Workout,
    HealthKit.Constants.Permissions.ActiveEnergyBurned,
    HealthKit.Constants.Permissions.DistanceWalkingRunning,
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);

  const writePerms = [HealthKit.Constants.Permissions.Workout].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );

  hkDebugLog(
    'buildPermissionPayload — filtered read perms (undefined removed)',
    readPerms,
  );
  hkDebugLog(
    'buildPermissionPayload — filtered write perms (undefined removed)',
    writePerms,
  );

  if (readPerms.length === 0) {
    hkDebugLog(
      'buildPermissionPayload — CRITICAL: no valid read permissions resolved, HealthKit will not prompt user',
      {},
    );
    return null;
  }

  return {
    permissions: {
      read: readPerms,
      write: writePerms,
    },
  };
}

/**
 * FIX #5: This function is now exported and called after initHealthKit succeeds
 * so permission grants are always logged.
 */
async function logIosHealthKitRetrievedPermissions(): Promise<void> {
  const HealthKit = getIosHealthKit();
  const payload = buildIosHealthKitPermissionPayload();
  if (!HealthKit?.getAuthStatus || !payload) {
    hkDebugLog('getAuthStatus — skipped', {
      reason: !HealthKit
        ? 'no module'
        : 'getAuthStatus missing on native module',
    });
    return;
  }
  try {
    await new Promise<void>(resolve => {
      HealthKit.getAuthStatus(payload, (...cbArgs: unknown[]) => {
        hkDebugLogCallbackArgs('getAuthStatus', cbArgs);
        const [err, raw] = unwrapHkResponseArgs(cbArgs) as [
          unknown,
          { permissions?: { read?: number[]; write?: number[] } } | undefined,
        ];
        if (hkCallbackFailed(err)) {
          hkDebugLog('getAuthStatus — unwrapped err', err);
          resolve();
          return;
        }
        const readArr = raw?.permissions?.read;
        const writeArr = raw?.permissions?.write;
        if (!Array.isArray(readArr) || !Array.isArray(writeArr)) {
          hkDebugLog('getAuthStatus — unexpected payload', raw);
          resolve();
          return;
        }
        const read = payload.permissions.read.map((name, i) => {
          const code = Number(readArr[i]);
          return {
            permission: name,
            hkAuthorizationStatus: Number.isFinite(code) ? code : null,
            meaning: hkAuthStatusMeaning(Number.isFinite(code) ? code : -1),
          };
        });
        const write = payload.permissions.write.map((name, i) => {
          const code = Number(writeArr[i]);
          return {
            permission: name,
            hkAuthorizationStatus: Number.isFinite(code) ? code : null,
            meaning: hkAuthStatusMeaning(Number.isFinite(code) ? code : -1),
          };
        });
        hkDebugLog(
          'getAuthStatus — ✅ PERMISSION REPORT (Apple hides read access; notDetermined ≠ denied)',
          { read, write },
        );
        hkDebugLog(
          'getAuthStatus — NOTE: read permissions always show notDetermined on iOS for privacy. ' +
            'sharingDenied on write = user explicitly denied. Go to Health → your profile → Apps → HealthFirst to fix.',
          {},
        );
        resolve();
      });
    });
  } catch (e) {
    hkDebugLog('getAuthStatus — threw', e);
  }
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
      const permPayload = buildIosHealthKitPermissionPayload();
      if (!permPayload) {
        resolve({
          ok: false,
          error:
            'Apple Health constants failed to load or all permissions resolved to undefined. Rebuild the iOS app after `pod install`.',
        });
        return;
      }
      hkDebugLog('initHealthKit — requesting permissions', permPayload);
      HealthKit.initHealthKit(permPayload, (...cbArgs: unknown[]) => {
        hkDebugLogCallbackArgs('initHealthKit', cbArgs);
        const [err] = unwrapHkResponseArgs(cbArgs);
        hkDebugLog('initHealthKit — unwrapped err', err);
        if (hkCallbackFailed(err)) {
          resolve({ ok: false, error: formatHealthKitInitError(err) });
          return;
        }
        resolve({ ok: true });
      });
    } catch (e) {
      resolve({ ok: false, error: formatHealthKitInitError(e) });
    }
  });
}

function promisifyGetStepCountForDateIso(dateIso: string): Promise<number> {
  return new Promise(resolve => {
    const HealthKit = getIosHealthKit();
    if (!HealthKit) {
      resolve(0);
      return;
    }
    try {
      const opts = { date: dateIso, includeManuallyAdded: true };
      hkDebugLog('getStepCount — options', opts);
      HealthKit.getStepCount(opts, (...cbArgs: unknown[]) => {
        hkDebugLogCallbackArgs('getStepCount', cbArgs);
        const [err, r] = unwrapHkResponseArgs(cbArgs) as [
          unknown,
          { value?: number } | undefined,
        ];
        hkDebugLog('getStepCount — unwrapped', { err, r });
        if (
          hkCallbackFailed(err) ||
          r?.value == null ||
          Number.isNaN(r.value)
        ) {
          hkDebugLog('getStepCount — resolved', 0);
          resolve(0);
        } else {
          const n = Math.round(r.value);
          hkDebugLog('getStepCount — resolved', n);
          resolve(n);
        }
      });
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
      const opts = {
        startDate: dayStart.toISOString(),
        endDate: queryEnd.toISOString(),
        period: 60,
        includeManuallyAdded: true,
      };
      hkDebugLog('getDailyStepCountSamples — options', opts);
      HealthKit.getDailyStepCountSamples(opts, (...cbArgs: unknown[]) => {
        hkDebugLogCallbackArgs('getDailyStepCountSamples', cbArgs);
        const [err, results] = unwrapHkResponseArgs(cbArgs) as [
          unknown,
          ReadonlyArray<{ value?: number }> | undefined,
        ];
        hkDebugLog('getDailyStepCountSamples — unwrapped err', err);
        if (hkCallbackFailed(err) || !Array.isArray(results)) {
          hkDebugLog('getDailyStepCountSamples — resolved (no array)', 0);
          resolve(0);
          return;
        }
        hkDebugLog('getDailyStepCountSamples — bucket count', results.length);
        hkDebugLog('getDailyStepCountSamples — all buckets', results);
        let sum = 0;
        for (const row of results) {
          const v = row?.value;
          if (typeof v === 'number' && Number.isFinite(v)) {
            sum += v;
          }
        }
        const n = Math.round(sum);
        hkDebugLog('getDailyStepCountSamples — sum', n);
        resolve(n);
      });
    } catch {
      resolve(0);
    }
  });
}

function promisifySumRawStepSamples(
  dayStart: Date,
  queryEnd: Date,
): Promise<number> {
  return new Promise(resolve => {
    const HealthKit = getIosHealthKit();
    if (!HealthKit?.getSamples) {
      resolve(0);
      return;
    }
    if (queryEnd.getTime() <= dayStart.getTime()) {
      resolve(0);
      return;
    }
    try {
      const opts = {
        type: 'StepCount',
        startDate: dayStart.toISOString(),
        endDate: queryEnd.toISOString(),
        limit: 25_000,
        ascending: false,
      };
      hkDebugLog('getSamples(StepCount) — options', opts);
      HealthKit.getSamples(opts, (...cbArgs: unknown[]) => {
        hkDebugLogCallbackArgs('getSamples(StepCount)', cbArgs);
        const [err, results] = unwrapHkResponseArgs(cbArgs) as [
          unknown,
          ReadonlyArray<{ quantity?: number }> | undefined,
        ];
        hkDebugLog('getSamples(StepCount) — unwrapped err', err);
        if (hkCallbackFailed(err) || !Array.isArray(results)) {
          hkDebugLog('getSamples(StepCount) — resolved', 0);
          resolve(0);
          return;
        }
        hkDebugLog('getSamples(StepCount) — sample count', results.length);
        hkDebugLog('getSamples(StepCount) — all samples', results);
        let sum = 0;
        for (const row of results) {
          const q = row?.quantity;
          if (typeof q === 'number' && Number.isFinite(q)) {
            sum += q;
          }
        }
        const n = Math.round(sum);
        hkDebugLog('getSamples(StepCount) — sum quantity', n);
        resolve(n);
      });
    } catch {
      resolve(0);
    }
  });
}

/**
 * FIX #1 applied here: pass midnight ISO string to getStepCount instead of noon.
 */
async function resolveStepsForLocalDay(dayStart: Date): Promise<number> {
  // FIX: use midnight (start of day) not noon — avoids off-by-one in some timezones
  const dateIso = isoMidnightLocalForDay(dayStart);
  hkDebugLog('resolveStepsForLocalDay — dayStart / midnightIso', {
    dayStart: dayStart.toISOString(),
    dateIso,
  });
  const fromStats = await promisifyGetStepCountForDateIso(dateIso);
  const qEnd = stepSampleQueryEnd(dayStart);
  const fromBuckets = await promisifyDailyStepBucketSum(dayStart, qEnd);
  const primary = Math.max(fromStats, fromBuckets);
  hkDebugLog('resolveStepsForLocalDay — primary (max of stats, buckets)', {
    fromStats,
    fromBuckets,
    primary,
  });
  if (primary > 0) {
    hkDebugLog('resolveStepsForLocalDay — final steps (primary)', primary);
    return primary;
  }
  const fromRaw = await promisifySumRawStepSamples(dayStart, qEnd);
  hkDebugLog('resolveStepsForLocalDay — final steps (raw fallback)', fromRaw);
  return fromRaw;
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
      /**
       * FIX #6: Some versions of react-native-health require 'Workout' and others
       * require 'HKWorkoutTypeIdentifier'. We try 'Workout' first (most common).
       * If workouts always return empty, try changing this to 'HKWorkoutTypeIdentifier'.
       */
      const workoutType = 'Workout';
      const opts = {
        type: workoutType,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit,
        ascending: false,
      };
      hkDebugLog('getSamples(Workout) — options', opts);
      HealthKit.getSamples(opts, (...cbArgs: unknown[]) => {
        hkDebugLogCallbackArgs('getSamples(Workout)', cbArgs);
        const [err, results] = unwrapHkResponseArgs(cbArgs) as [
          unknown,
          IosWorkoutDict[] | undefined,
        ];
        hkDebugLog('getSamples(Workout) — unwrapped err', err);
        if (hkCallbackFailed(err) || !Array.isArray(results)) {
          hkDebugLog('getSamples(Workout) — workouts', []);
          resolve([]);
        } else {
          hkDebugLog('getSamples(Workout) — workout count', results.length);
          hkDebugLog('getSamples(Workout) — all workouts (raw)', results);
          resolve(results);
        }
      });
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
    (x, y) => new Date(y.end ?? 0).getTime() - new Date(x.end ?? 0).getTime(),
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
      const opts = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: 200,
      };
      hkDebugLog('getAnchoredWorkouts — options', opts);
      HealthKit.getAnchoredWorkouts(opts, (...cbArgs: unknown[]) => {
        hkDebugLogCallbackArgs('getAnchoredWorkouts', cbArgs);
        const [err, r] = unwrapHkResponseArgs(cbArgs) as [
          unknown,
          { anchor?: string; data?: IosWorkoutDict[] } | undefined,
        ];
        hkDebugLog('getAnchoredWorkouts — unwrapped err', err);
        hkDebugLog(
          'getAnchoredWorkouts — unwrapped payload keys',
          r && typeof r === 'object' ? Object.keys(r) : r,
        );
        if (hkCallbackFailed(err) || !r?.data) {
          hkDebugLog('getAnchoredWorkouts — workouts', []);
          resolve([]);
        } else {
          hkDebugLog('getAnchoredWorkouts — anchor (if any)', r.anchor);
          hkDebugLog('getAnchoredWorkouts — workout count', r.data.length);
          hkDebugLog('getAnchoredWorkouts — all workouts (raw)', r.data);
          resolve(r.data);
        }
      });
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
        distanceKm:
          distMi > 0 ? Math.round(distMi * MILES_TO_KM * 10) / 10 : undefined,
        ...(deviceLabel ? { deviceLabel } : {}),
      };
    });
}

/**
 * iOS: request HealthKit access and return today's step count + recent workouts.
 *
 * FIXES applied:
 *  #1 — getStepCount now receives midnight ISO (not noon) to avoid timezone off-by-one.
 *  #4 — Permission constants are validated and undefined values are filtered out before
 *       calling initHealthKit. If any key is undefined, it is logged and dropped.
 *  #5 — logIosHealthKitRetrievedPermissions() is now called after initHealthKit succeeds
 *       so you can see exactly what was granted in Metro logs.
 *  #6 — getSamples workout type string is explicitly 'Workout' with a comment to switch
 *       to 'HKWorkoutTypeIdentifier' if workouts still return empty.
 */
export async function fetchIosHealthSnapshot(): Promise<{
  ok: boolean;
  stepsToday: number;
  workouts: ExerciseSessionRow[];
  errorMessage?: string;
  /** Shown when HK authorizes but returns no data (read access often off). */
  appleHealthReadHint?: string;
}> {
  if (Platform.OS !== 'ios') {
    return { ok: false, stepsToday: 0, workouts: [] };
  }
  hkDebugLog('fetchIosHealthSnapshot — start', {
    time: new Date().toISOString(),
  });
  if (!getIosHealthKit()) {
    const nm = NativeModules.AppleHealthKit as
      | Record<string, unknown>
      | undefined;
    hkDebugLog('fetchIosHealthSnapshot — getIosHealthKit() null', {
      hasAppleHealthKitNative: nm != null,
      nativeMethodKeys:
        nm != null && typeof nm === 'object' ? Object.keys(nm) : [],
    });
    return {
      ok: false,
      stepsToday: 0,
      workouts: [],
      errorMessage:
        'Could not load Apple Health. Rebuild the iOS app after `pod install`.',
    };
  }
  const available = await promisifyIsHealthDataAvailable();
  hkDebugLog(
    'fetchIosHealthSnapshot — isHealthDataAvailable result',
    available,
  );
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
  hkDebugLog('fetchIosHealthSnapshot — initHealthKit result', init);
  if (!init.ok) {
    return {
      ok: false,
      stepsToday: 0,
      workouts: [],
      errorMessage: init.error,
    };
  }

  // FIX #5: Always log permissions after a successful init so you can see what was granted.
  await logIosHealthKitRetrievedPermissions();

  const { start } = dayBounds();
  const stepsToday = await resolveStepsForLocalDay(start);
  const histStart = new Date();
  histStart.setDate(histStart.getDate() - 90);
  histStart.setHours(0, 0, 0, 0);
  const queryStart = new Date(histStart.getTime() - 24 * 60 * 60 * 1000);
  const endNow = new Date();
  hkDebugLog('fetchIosHealthSnapshot — workout query window', {
    queryStart: queryStart.toISOString(),
    endNow: endNow.toISOString(),
  });
  const [anchored, samples] = await Promise.all([
    promisifyAnchoredWorkouts(queryStart, endNow),
    promisifyWorkoutSamples(queryStart, endNow, 250),
  ]);
  const merged = mergeIosWorkoutDicts(anchored, samples);
  const skipped = merged.filter(w => !w.id || !w.start || !w.end);
  hkDebugLog('fetchIosHealthSnapshot — workout merge', {
    anchoredCount: anchored.length,
    sampleQueryCount: samples.length,
    mergedUniqueCount: merged.length,
    skippedByMapperCount: skipped.length,
    skippedRowsMissingFields: skipped,
  });
  const workouts = mapIosWorkouts(merged);
  hkDebugLog(
    'fetchIosHealthSnapshot — final mapped sessions (UI rows)',
    workouts,
  );
  hkDebugLog('fetchIosHealthSnapshot — done summary', {
    ok: true,
    stepsToday,
    workoutSessionCount: workouts.length,
  });
  const appleHealthReadHint =
    stepsToday === 0 && workouts.length === 0
      ? 'Health connected, but Apple returned no steps or workouts. Open the Health app → your profile (photo) → Apps → HealthFirst → turn on Steps and Workouts. Apple never tells the app if read access is denied—you only see empty data.'
      : undefined;
  return { ok: true, stepsToday, workouts, appleHealthReadHint };
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
    const HC =
      require('react-native-health-connect') as typeof import('react-native-health-connect');
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
          rec.metadata?.id ?? `hc-${startT}-${String(rec.exerciseType ?? 0)}`;
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
    const HC =
      require('react-native-health-connect') as typeof import('react-native-health-connect');
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
      const type = activityName.toLowerCase().includes('run')
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
        (...cbArgs: unknown[]) => {
          const [err] = unwrapHkResponseArgs(cbArgs);
          resolve(!hkCallbackFailed(err));
        },
      );
    } catch {
      resolve(false);
    }
  });
}
