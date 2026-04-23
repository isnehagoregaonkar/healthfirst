import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import {
  isMealCalorieProfileDefault,
  loadMealCalorieProfile,
  type MealCalorieProfile,
} from '../../services/mealCalorieTarget';
import { loadUserGoals } from '../../services/goals';
import { upsertExternalHeartRateReading } from '../../services/vitals';
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

/** HKWorkout.duration from react-native-health is seconds. */
function workoutDurationMinutesNumIos(w: unknown): number | null {
  if (!w || typeof w !== 'object') {
    return null;
  }
  const o = w as Record<string, unknown>;
  const d = numOrNull(o.duration);
  if (d !== null && d > 0) {
    // Some providers expose seconds, others expose minutes. Handle both.
    if (d >= 180) {
      return Math.max(1, Math.round(d / 60));
    }
    return Math.max(1, Math.round(d));
  }
  const start = typeof o.startDate === 'string' ? o.startDate : null;
  const end = typeof o.endDate === 'string' ? o.endDate : null;
  if (!start || !end) {
    return null;
  }
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) {
    return null;
  }
  return Math.max(1, Math.round((b - a) / 60000));
}

function workoutEnergyKcalIos(w: unknown): number | null {
  if (!w || typeof w !== 'object') {
    return null;
  }
  const o = w as Record<string, unknown>;
  const c = numOrNull(o.calories);
  return c === null ? null : Math.round(c * 10) / 10;
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

function formatWorkoutName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function workoutDurationMinutesNumAndroid(w: unknown): number | null {
  if (!w || typeof w !== 'object') {
    return null;
  }
  const o = w as {
    startTime?: string;
    endTime?: string;
    duration?: number;
  };
  if (o.startTime && o.endTime) {
    const a = new Date(o.startTime).getTime();
    const b = new Date(o.endTime).getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) {
      return Math.max(1, Math.round((b - a) / 60000));
    }
  }
  const dur = numOrNull(o.duration);
  if (dur == null || dur <= 0) {
    return null;
  }
  // In practice this can be either milliseconds or seconds depending on source.
  if (dur > 3600) {
    return Math.max(1, Math.round(dur / 60000));
  }
  return Math.max(1, Math.round(dur / 60));
}

function workoutEnergyKcalAndroid(w: unknown): number | null {
  if (!w || typeof w !== 'object') {
    return null;
  }
  const o = w as { totalEnergyBurned?: { inKilocalories?: unknown } };
  const kcal = o.totalEnergyBurned?.inKilocalories;
  const v = numOrNull(kcal);
  return v === null ? null : Math.round(v * 10) / 10;
}

type GroupedWorkoutRow = Readonly<{
  key: string;
  title: string;
  sessions: number;
  totalMinutes: number;
  totalKcal: number | null;
}>;

function addNullableNumbers(a: number | null, b: number | null): number | null {
  if (a === null && b === null) {
    return null;
  }
  return (a ?? 0) + (b ?? 0);
}

function groupSimilarWorkouts(
  workouts: readonly unknown[],
  isIos: boolean,
): GroupedWorkoutRow[] {
  const map = new Map<
    string,
    {
      title: string;
      sessions: number;
      totalMinutes: number;
      totalKcal: number | null;
    }
  >();
  for (const w of workouts) {
    const rawTitle = isIos ? workoutLabelIos(w) : workoutTitleAndroid(w);
    const title = formatWorkoutName(rawTitle);
    const key = title.toLowerCase().replace(/\s+/g, ' ').trim() || 'workout';
    const mins = isIos
      ? workoutDurationMinutesNumIos(w)
      : workoutDurationMinutesNumAndroid(w);
    const kcal = isIos ? workoutEnergyKcalIos(w) : workoutEnergyKcalAndroid(w);
    const prev = map.get(key);
    const addMins = mins ?? 0;
    if (!prev) {
      map.set(key, {
        title,
        sessions: 1,
        totalMinutes: addMins,
        totalKcal: kcal,
      });
    } else {
      map.set(key, {
        title: prev.title,
        sessions: prev.sessions + 1,
        totalMinutes: prev.totalMinutes + addMins,
        totalKcal: addNullableNumbers(prev.totalKcal, kcal),
      });
    }
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({
      key,
      title: v.title,
      sessions: v.sessions,
      totalMinutes: v.totalMinutes,
      totalKcal: v.totalKcal,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
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
            const b = numOrNull(
              (s as { beatsPerMinute: unknown }).beatsPerMinute,
            );
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

/** Daily targets shown on cards (steps goal is the common 10k default). */
const STEP_GOAL = 10_000;
const ACTIVE_ENERGY_GOAL_KCAL = 400;
const WORKOUT_SESSION_GOAL = 3;

type DayMetrics = Readonly<{
  steps: number | null;
  energyKcal: number | null;
  avgHr: number | null;
  workoutCount: number;
}>;

function addDaysLocal(day: Date, deltaDays: number): Date {
  const d = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate() + deltaDays,
  );
  return startOfLocalDay(d);
}

/** Monday-start calendar week containing `day` (local). */
function startOfLocalWeekMonday(day: Date): Date {
  const d = startOfLocalDay(day);
  const dow = d.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDaysLocal(d, delta);
}

function formatWeekRangeLabel(weekStart: Date): string {
  const weekEnd = addDaysLocal(weekStart, 6);
  const y = weekEnd.getFullYear();
  const a = weekStart.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const b = weekEnd.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (weekStart.getFullYear() !== y) {
    const aFull = weekStart.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${aFull} – ${b}`;
  }
  return `${a} – ${b}`;
}

const ACTIVE_DAY_MIN_STEPS = 5000;

function localDayBounds(day: Date): Readonly<{ start: Date; end: Date }> {
  const start = startOfLocalDay(day);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { start, end };
}

function localDayMidpoint(day: Date): Date {
  const mid = startOfLocalDay(day);
  mid.setHours(12, 0, 0, 0);
  return mid;
}

function dayMetricsFromIosRaw(d: Record<string, unknown>): DayMetrics {
  const steps = parseIosStepCount(d.stepCount);
  const hrSamples = parseIosSamplesArray(d.heartRateSamples);
  const workouts = parseIosSamplesArray(d.workouts);
  return {
    steps,
    energyKcal: sumActiveEnergyIos(d.activeEnergyBurned),
    avgHr: avgHeartFromIosSamples(hrSamples),
    workoutCount: workouts.length,
  };
}

function dayMetricsFromAndroidRaw(d: Record<string, unknown>): DayMetrics {
  return {
    steps: sumAndroidSteps(d.steps),
    energyKcal: activeEnergyAndroid(d.exercise),
    avgHr: avgHrAndroid(d.heartRate),
    workoutCount: readHcRecords(d.exercise).length,
  };
}

function meanOfNumbers(
  values: readonly (number | null | undefined)[],
): number | null {
  const ok = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (ok.length === 0) {
    return null;
  }
  return ok.reduce((a, b) => a + b, 0) / ok.length;
}

function buildStepsInsight(
  today: number | null,
  prior7: readonly (DayMetrics | null)[],
): string | null {
  if (today === null) {
    return null;
  }
  const y = prior7[0];
  if (y?.steps != null && y.steps > 0) {
    const pct = Math.round(((today - y.steps) / y.steps) * 100);
    if (pct === 0) {
      return 'Same as yesterday';
    }
    return `${pct > 0 ? '+' : ''}${pct}% vs yesterday`;
  }
  if (y?.steps === 0 && today > 0) {
    return 'Ahead of yesterday';
  }
  const avgSteps = meanOfNumbers(prior7.map(p => p?.steps ?? null));
  if (avgSteps !== null && avgSteps > 0) {
    const pct = Math.round(((today - avgSteps) / avgSteps) * 100);
    if (Math.abs(pct) < 4) {
      return 'Matches your recent week';
    }
    return `${pct > 0 ? '+' : ''}${pct}% vs 7-day average`;
  }
  return 'Trends unlock after more history';
}

function buildEnergyInsight(
  today: number | null,
  prior7: readonly (DayMetrics | null)[],
): string | null {
  if (today === null) {
    return null;
  }
  const avgKcal = meanOfNumbers(prior7.map(p => p?.energyKcal ?? null));
  if (avgKcal !== null && avgKcal > 0) {
    if (today < avgKcal * 0.9) {
      return 'Below average today';
    }
    if (today > avgKcal * 1.1) {
      return 'Above your recent average';
    }
    return 'In line with your week';
  }
  const y = prior7[0];
  if (y?.energyKcal != null && y.energyKcal > 0) {
    const pct = Math.round(((today - y.energyKcal) / y.energyKcal) * 100);
    if (pct === 0) {
      return 'Same burn as yesterday';
    }
    return `${pct > 0 ? '+' : ''}${pct}% vs yesterday`;
  }
  return null;
}

function buildWorkoutInsight(
  today: number,
  prior7: readonly (DayMetrics | null)[],
): string | null {
  const y = prior7[0];
  if (y == null) {
    return null;
  }
  const d = today - y.workoutCount;
  if (d === 0) {
    return 'Same as yesterday';
  }
  if (d > 0) {
    return `+${d} vs yesterday`;
  }
  return `${d} vs yesterday`;
}

function buildHrInsight(
  today: number | null,
  prior7: readonly (DayMetrics | null)[],
): string | null {
  if (today === null) {
    return null;
  }
  const y = prior7[0]?.avgHr;
  if (today >= 55 && today <= 100) {
    if (y != null && y > 0 && Math.abs(today - y) >= 6) {
      const pct = Math.round(((today - y) / y) * 100);
      return `Normal range · ${pct > 0 ? '+' : ''}${pct}% vs yesterday`;
    }
    return 'Normal range';
  }
  if (today < 55) {
    return 'Lower than typical';
  }
  return 'Above typical resting';
}

function isTodayLocal(day: Date): boolean {
  return (
    startOfLocalDay(day).getTime() === startOfLocalDay(new Date()).getTime()
  );
}

type CoachingCard = Readonly<{
  sectionTitle: string;
  body: string;
  hint?: string;
}>;

/** One prioritized “coach” line (+ optional second line) for the insight card. */
function buildCoachingInsight(
  summary: Readonly<{
    steps: number | null;
    energyKcal: number | null;
    avgHr: number | null;
    workoutCount: number;
  }>,
  prior7: readonly (DayMetrics | null)[],
  viewingToday: boolean,
): CoachingCard {
  const timeWord = viewingToday ? 'today' : 'on this day';
  const sectionTitle = viewingToday ? "Today's insight" : 'Day insight';
  const y = prior7[0];
  const { steps, energyKcal: energy, avgHr: hr, workoutCount: wc } = summary;

  type Cand = Readonly<{ score: number; body: string }>;
  const cands: Cand[] = [];

  if (steps != null && steps < STEP_GOAL) {
    const gap = Math.round(STEP_GOAL - steps);
    if (gap >= 250) {
      cands.push({
        score: 100,
        body: `You're ${gap.toLocaleString()} steps away from your goal.`,
      });
    } else if (gap >= 50) {
      cands.push({
        score: 88,
        body: `You're ${gap.toLocaleString()} steps from your goal — a short walk closes the gap.`,
      });
    }
  }
  if (steps != null && steps >= STEP_GOAL) {
    cands.push({
      score: 86,
      body: `You hit your ${STEP_GOAL.toLocaleString()}-step goal. Strong work.`,
    });
  }

  if (hr != null) {
    if (hr > 102) {
      cands.push({
        score: 94,
        body: `Your heart rate is slightly elevated ${timeWord}.`,
      });
    } else if (
      y?.avgHr != null &&
      y.avgHr > 0 &&
      hr >= 78 &&
      hr > y.avgHr * 1.08
    ) {
      cands.push({
        score: 82,
        body: `Your heart rate is a bit higher than yesterday — worth a breather if you feel off.`,
      });
    }
  }

  const avgWorkouts = meanOfNumbers(prior7.map(p => p?.workoutCount ?? null));
  if (wc >= 1) {
    if (y != null && wc > y.workoutCount) {
      cands.push({ score: 92, body: 'You worked out more than usual 💪' });
    } else if (avgWorkouts != null && wc > avgWorkouts + 0.49) {
      cands.push({ score: 87, body: 'You worked out more than usual 💪' });
    }
  }

  const avgEnergy = meanOfNumbers(prior7.map(p => p?.energyKcal ?? null));
  if (
    energy != null &&
    avgEnergy != null &&
    avgEnergy > 0 &&
    energy > avgEnergy * 1.12
  ) {
    cands.push({
      score: 72,
      body: `Active calories are above your recent average — nice momentum ${timeWord}.`,
    });
  }

  if (steps != null && steps < STEP_GOAL && steps >= STEP_GOAL * 0.72) {
    cands.push({
      score: 58,
      body: `You're within reach of your step goal ${
        viewingToday ? 'today' : 'for this day'
      }.`,
    });
  }

  if (cands.length === 0) {
    if (steps == null && hr == null && energy == null && wc === 0) {
      return {
        sectionTitle,
        body: 'Connect health data to unlock personalized insights for this day.',
      };
    }
    return {
      sectionTitle,
      body: viewingToday
        ? 'Keep moving — your trends sharpen as you check in each day.'
        : 'Select another day to compare, or come back after more activity is logged.',
    };
  }

  const sorted = [...cands].sort((a, b) => b.score - a.score);
  const primary = sorted[0];
  let secondary: Cand | undefined;
  for (let i = 1; i < sorted.length; i += 1) {
    const c = sorted[i];
    if (c.body !== primary.body && primary.score - c.score <= 16) {
      secondary = c;
      break;
    }
  }

  return {
    sectionTitle,
    body: primary.body,
    hint: secondary?.body,
  };
}

async function fetchIosExerciseRawForDay(
  day: Date,
): Promise<Record<string, unknown>> {
  if (!AppleHealthKit) {
    return { error: 'HealthKit is not available on this build.' };
  }
  const { start, end } = localDayBounds(day);
  const options = {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    date: start.toISOString(),
  };
  const runMethod = (
    methodName: string,
    methodOptions: Record<string, unknown>,
  ) =>
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
    stepCount: await runMethod('getStepCount', { date: options.date }),
    heartRateSamples: await runMethod('getHeartRateSamples', options),
    workouts: await runMethod('getSamples', { ...options, type: 'Workout' }),
    activeEnergyBurned: await runMethod('getActiveEnergyBurned', options),
  };
}

async function fetchAndroidExerciseRawForDay(
  day: Date,
): Promise<Record<string, unknown>> {
  try {
    const hc = await import('react-native-health-connect');
    await hc.initialize();
    const { start, end } = localDayBounds(day);
    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
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
    return { steps, heartRate, exercise };
  } catch (e) {
    return { error: errorText(e) };
  }
}

async function safeMetricsForDay(day: Date): Promise<DayMetrics | null> {
  try {
    if (Platform.OS === 'ios') {
      const raw = await fetchIosExerciseRawForDay(day);
      if (
        raw &&
        typeof raw === 'object' &&
        'error' in raw &&
        typeof (raw as { error?: unknown }).error === 'string'
      ) {
        return null;
      }
      return dayMetricsFromIosRaw(raw as Record<string, unknown>);
    }
    const raw = await fetchAndroidExerciseRawForDay(day);
    if (raw && typeof raw === 'object' && 'error' in raw) {
      return null;
    }
    return dayMetricsFromAndroidRaw(raw as Record<string, unknown>);
  } catch {
    return null;
  }
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

/** Tanaka-style max HR estimate (in-app only, not medical advice). */
function estimatedMaxHrBpm(age: number): number {
  const a = Math.min(100, Math.max(14, age));
  return Math.round(208 - 0.7 * a);
}

/** Moderate “fat burn” band as % of estimated max HR. */
function fatBurnHeartRangeBpm(
  age: number,
): Readonly<{ low: number; high: number; maxHr: number }> {
  const maxHr = estimatedMaxHrBpm(age);
  return {
    low: Math.round(maxHr * 0.59),
    high: Math.round(maxHr * 0.72),
    maxHr,
  };
}

function buildHeartFatBurnCardCopy(
  avgHr: number | null,
  profile: MealCalorieProfile | null,
): string | null {
  if (!profile) {
    return null;
  }
  const { low, high, maxHr } = fatBurnHeartRangeBpm(profile.age);
  const isDefault = isMealCalorieProfileDefault(profile);
  const lines: string[] = [
    `Fat-burn ~${low}–${high} bpm (~59–72% of est. max ${maxHr} bpm).`,
  ];
  if (isDefault) {
    lines.push('Save your body profile for a range matched to you.');
  }
  return lines.join('\n');
}

function StatProgressBar({
  progress,
  fillColor,
}: Readonly<{ progress: number; fillColor: string }>) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${p * 100}%`, backgroundColor: fillColor },
        ]}
      />
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  goalLabel,
  progress,
  zoneHint,
  insight,
}: Readonly<{
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  goalLabel?: string;
  progress?: number | null;
  /** e.g. fat-burn HR band (heart card) */
  zoneHint?: string | null;
  insight?: string | null;
}>) {
  const showBar =
    goalLabel != null && progress != null && Number.isFinite(progress);
  return (
    <View style={[styles.statCard, cardChrome]}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconWrap, { backgroundColor: `${accent}18` }]}>
          <Icon name={icon} size={22} color={accent} />
        </View>
        <Text style={styles.statLabelInline}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      {zoneHint ? <Text style={styles.statZoneHint}>{zoneHint}</Text> : null}
      {showBar ? (
        <>
          <Text style={styles.statGoal}>{goalLabel}</Text>
          <StatProgressBar progress={progress!} fillColor={accent} />
        </>
      ) : null}
      {insight ? <Text style={styles.statInsight}>{insight}</Text> : null}
    </View>
  );
}

export function ExerciseScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDay, setSelectedDay] = useState(() =>
    startOfLocalDay(new Date()),
  );
  const activeDay = useMemo(() => startOfLocalDay(selectedDay), [selectedDay]);

  const [state, setState] = useState<HealthState>(emptyHealthState);
  const [loading, setLoading] = useState(false);
  const [trendPrior7, setTrendPrior7] = useState<(DayMetrics | null)[]>(() =>
    Array.from({ length: 7 }, () => null),
  );
  const [weekStripMetrics, setWeekStripMetrics] = useState<
    (DayMetrics | null)[]
  >(() => Array.from({ length: 7 }, () => null));
  const [mealProfile, setMealProfile] = useState<MealCalorieProfile | null>(
    null,
  );
  const [energyGoalKcal, setEnergyGoalKcal] = useState(ACTIVE_ENERGY_GOAL_KCAL);
  const healthBootstrapDone = useRef(false);

  useEffect(() => {
    let alive = true;
    void loadMealCalorieProfile().then(p => {
      if (alive) {
        setMealProfile(p);
      }
    });
    void loadUserGoals().then(goals => {
      if (alive) {
        setEnergyGoalKcal(goals.calorieBurnGoal);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const selectDay = useCallback((d: Date) => {
    setSelectedDay(startOfLocalDay(d));
  }, []);

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
      /* silent — user can enable in system settings */
    } finally {
      healthBootstrapDone.current = true;
    }
  }, []);

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

      if (summary.avgHr != null) {
        const source = Platform.OS === 'ios' ? 'healthkit' : 'health_connect';
        void upsertExternalHeartRateReading({
          bpm: summary.avgHr,
          recordedAt: localDayMidpoint(activeDay),
          source,
        }).then(res => {
          if (!res.ok) {
            console.warn('[ExerciseScreen] Heart rate history sync:', res.error.message);
          }
        });
      }
    },
    [activeDay],
  );

  const loadDay = useCallback(async () => {
    await bootstrapHealthAccess();
    setLoading(true);
    const priorStarts = [1, 2, 3, 4, 5, 6, 7].map(off =>
      addDaysLocal(activeDay, -off),
    );
    const weekStart = startOfLocalWeekMonday(activeDay);
    const weekDayList = [0, 1, 2, 3, 4, 5, 6].map(i =>
      addDaysLocal(weekStart, i),
    );
    try {
      if (Platform.OS === 'ios') {
        const [mainRaw, priorMs, weekMs] = await Promise.all([
          fetchIosExerciseRawForDay(activeDay),
          Promise.all(priorStarts.map(d => safeMetricsForDay(d))),
          Promise.all(weekDayList.map(d => safeMetricsForDay(d))),
        ]);
        setTrendPrior7(priorMs);
        setWeekStripMetrics(weekMs);
        if (
          mainRaw &&
          typeof mainRaw === 'object' &&
          'error' in mainRaw &&
          typeof (mainRaw as { error?: unknown }).error === 'string'
        ) {
          setState(prev => ({
            ...prev,
            iosData: {},
            error: errorText((mainRaw as { error: unknown }).error),
          }));
          setWeekStripMetrics(Array.from({ length: 7 }, () => null));
          return;
        }
        setState(prev => ({
          ...prev,
          iosData: mainRaw as Record<string, unknown>,
          error: null,
        }));
        const d = mainRaw as Record<string, unknown>;
        const m = dayMetricsFromIosRaw(d);
        backgroundSync({
          steps: m.steps,
          energyKcal: m.energyKcal,
          avgHr: m.avgHr,
          workoutCount: m.workoutCount,
          rawPlatform: d,
        });
      } else {
        const [mainRaw, priorMs, weekMs] = await Promise.all([
          fetchAndroidExerciseRawForDay(activeDay),
          Promise.all(priorStarts.map(d => safeMetricsForDay(d))),
          Promise.all(weekDayList.map(d => safeMetricsForDay(d))),
        ]);
        setTrendPrior7(priorMs);
        setWeekStripMetrics(weekMs);
        if (mainRaw && typeof mainRaw === 'object' && 'error' in mainRaw) {
          setState(prev => ({
            ...prev,
            androidData: {},
            error: errorText((mainRaw as { error: unknown }).error),
          }));
          setWeekStripMetrics(Array.from({ length: 7 }, () => null));
          return;
        }
        setState(prev => ({ ...prev, androidData: mainRaw, error: null }));
        const d = mainRaw as Record<string, unknown>;
        const m = dayMetricsFromAndroidRaw(d);
        backgroundSync({
          steps: m.steps,
          energyKcal: m.energyKcal,
          avgHr: m.avgHr,
          workoutCount: m.workoutCount,
          rawPlatform: d,
        });
      }
    } catch (e) {
      setState(prev => ({ ...prev, error: errorText(e) }));
    } finally {
      setLoading(false);
    }
  }, [activeDay, backgroundSync, bootstrapHealthAccess]);

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

  const statContext = useMemo(() => {
    if (!summary) {
      return null;
    }
    const stepsProgress =
      summary.steps != null && summary.steps >= 0
        ? Math.min(1, summary.steps / STEP_GOAL)
        : null;
    const energyProgress =
      summary.energyKcal != null && summary.energyKcal >= 0
        ? Math.min(1, summary.energyKcal / Math.max(energyGoalKcal, 1))
        : null;
    const workoutProgress = Math.min(
      1,
      summary.workoutCount / WORKOUT_SESSION_GOAL,
    );
    return {
      stepsInsight: buildStepsInsight(summary.steps, trendPrior7),
      energyInsight: buildEnergyInsight(summary.energyKcal, trendPrior7),
      workoutInsight: buildWorkoutInsight(summary.workoutCount, trendPrior7),
      hrInsight: buildHrInsight(summary.avgHr, trendPrior7),
      stepsProgress,
      energyProgress,
      workoutProgress,
    };
  }, [summary, trendPrior7, energyGoalKcal]);

  const coachingCard = useMemo(() => {
    if (!summary) {
      return null;
    }
    return buildCoachingInsight(summary, trendPrior7, isTodayLocal(activeDay));
  }, [summary, trendPrior7, activeDay]);

  const heartFatBurnCopy = useMemo(() => {
    if (!summary) {
      return null;
    }
    return buildHeartFatBurnCardCopy(summary.avgHr, mealProfile);
  }, [summary, mealProfile]);

  const weekStripSummary = useMemo(() => {
    const weekStart = startOfLocalWeekMonday(activeDay);
    const rangeLabel = formatWeekRangeLabel(weekStart);
    const metrics =
      weekStripMetrics.length === 7
        ? weekStripMetrics
        : Array.from({ length: 7 }, () => null);
    const stepVals = metrics
      .map(m => m?.steps ?? null)
      .filter((v): v is number => v != null);
    const avgSteps =
      stepVals.length > 0
        ? Math.round(stepVals.reduce((a, b) => a + b, 0) / stepVals.length)
        : null;
    const totalWorkouts = metrics.reduce(
      (acc, m) => acc + (m?.workoutCount ?? 0),
      0,
    );
    const activeDays = metrics.filter(m => {
      if (!m) {
        return false;
      }
      return (m.steps ?? 0) >= ACTIVE_DAY_MIN_STEPS || m.workoutCount >= 1;
    }).length;
    return { rangeLabel, avgSteps, totalWorkouts, activeDays };
  }, [weekStripMetrics, activeDay]);

  const groupedWorkouts = useMemo(() => {
    if (!summary || summary.workouts.length === 0) {
      return [];
    }
    return groupSimilarWorkouts(summary.workouts, Platform.OS === 'ios');
  }, [summary]);

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

        <View style={[styles.weekStrip, cardChrome]}>
          <Text style={styles.weekStripEyebrow}>This week</Text>
          <Text style={styles.weekStripRange}>
            {weekStripSummary.rangeLabel}
          </Text>
          <View style={styles.weekStripMetricsRow}>
            <View style={styles.weekStripMetric}>
              <Text style={styles.weekStripMetricValue}>
                {weekStripSummary.avgSteps == null
                  ? '—'
                  : weekStripSummary.avgSteps.toLocaleString()}
              </Text>
              <Text style={styles.weekStripMetricLabel}>Avg steps</Text>
            </View>
            <View style={styles.weekStripDivider} />
            <View style={styles.weekStripMetric}>
              <Text style={styles.weekStripMetricValue}>
                {weekStripSummary.totalWorkouts}
              </Text>
              <Text style={styles.weekStripMetricLabel} numberOfLines={2}>
                Total workouts
              </Text>
            </View>
            <View style={styles.weekStripDivider} />
            <View style={styles.weekStripMetric}>
              <Text style={styles.weekStripMetricValue}>
                {weekStripSummary.activeDays}/7
              </Text>
              <Text style={styles.weekStripMetricLabel}>Active days</Text>
            </View>
          </View>
        </View>

        {state.error ? (
          <Text style={styles.bannerError}>{state.error}</Text>
        ) : null}

        {!summary && !loading ? (
          <Text style={styles.empty}>
            Allow health access in Settings to see this day.
          </Text>
        ) : null}

        {summary ? (
          <>
            <View style={styles.statGrid}>
              <StatCard
                icon="walk"
                label="Steps"
                value={
                  summary.steps === null
                    ? '—'
                    : String(Math.round(summary.steps))
                }
                sub="steps"
                accent={colors.primary}
                goalLabel={`Goal ${STEP_GOAL.toLocaleString()}`}
                progress={statContext?.stepsProgress ?? null}
                insight={statContext?.stepsInsight ?? null}
              />
              <StatCard
                icon="fire"
                label="Active energy"
                value={
                  summary.energyKcal === null ? '—' : `${summary.energyKcal}`
                }
                sub={summary.energyKcal !== null ? 'kcal' : undefined}
                accent={colors.primary}
                goalLabel={`Goal ${energyGoalKcal} kcal`}
                progress={statContext?.energyProgress ?? null}
                insight={statContext?.energyInsight ?? null}
              />
              <StatCard
                icon="dumbbell"
                label="Workouts"
                value={String(summary.workoutCount)}
                sub="sessions"
                accent={colors.primary}
                goalLabel={`Goal ${WORKOUT_SESSION_GOAL} sessions`}
                progress={statContext?.workoutProgress ?? null}
                insight={statContext?.workoutInsight ?? null}
              />
              <StatCard
                icon="heart-pulse"
                label="Heart rate"
                value={summary.avgHr === null ? '—' : `${summary.avgHr}`}
                sub={summary.avgHr !== null ? 'bpm avg' : undefined}
                accent="#dc2626"
                zoneHint={heartFatBurnCopy}
                insight={statContext?.hrInsight ?? null}
              />
            </View>

            {coachingCard ? (
              <View style={[styles.coachingCard, cardChrome]}>
                <View style={styles.coachingHeader}>
                  <View style={styles.coachingIconWrap}>
                    <Icon
                      name="lightbulb-on-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.coachingSectionTitle}>
                    {coachingCard.sectionTitle}
                  </Text>
                </View>
                <Text style={styles.coachingBody}>{coachingCard.body}</Text>
                {coachingCard.hint ? (
                  <Text style={styles.coachingHint}>{coachingCard.hint}</Text>
                ) : null}
              </View>
            ) : null}

            <View style={[styles.panel, cardChrome]}>
              <View style={styles.panelHead}>
                <Icon
                  name="format-list-bulleted"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.panelTitle}>Workouts</Text>
              </View>
              {summary.workoutCount === 0 ? (
                <Text style={styles.panelMuted}>No workouts for this day.</Text>
              ) : (
                groupedWorkouts.slice(0, 16).map(g => {
                  const wIcon = workoutIconName(g.title);
                  const kcalStr =
                    g.totalKcal != null
                      ? `${Math.round(g.totalKcal)} kcal`
                      : '— kcal';
                  const metaLine = [
                    g.sessions > 1 ? `${g.sessions}×` : null,
                    `${g.totalMinutes} min`,
                    kcalStr,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <View key={g.key} style={styles.workoutRow}>
                      <View style={styles.workoutIconCircle}>
                        <Icon name={wIcon} size={22} color={colors.primary} />
                      </View>
                      <View style={styles.workoutTextCol}>
                        <Text style={styles.workoutTitle}>{g.title}</Text>
                        <Text style={styles.workoutMeta}>{metaLine}</Text>
                      </View>
                    </View>
                  );
                })
              )}
              {summary.workoutCount > 0 && groupedWorkouts.length > 16 ? (
                <Text style={styles.panelMuted}>
                  Showing first 16 grouped types.
                </Text>
              ) : null}
              {summary.workoutCount > 0 &&
              groupedWorkouts.length < summary.workoutCount ? (
                <Text style={styles.panelFooter}>
                  {groupedWorkouts.length}{' '}
                  {groupedWorkouts.length === 1 ? 'type' : 'types'} ·{' '}
                  {summary.workoutCount} sessions
                </Text>
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
  weekStrip: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderColor: '#D6E4FF',
    backgroundColor: '#F8FBFF',
  },
  weekStripEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  weekStripRange: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  weekStripMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  weekStripMetric: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekStripMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  weekStripMetricLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  weekStripDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 4,
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
    borderColor: '#E8EEF7',
    backgroundColor: '#FFFFFF',
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabelInline: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.2,
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
  statZoneHint: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  statGoal: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  progressTrack: {
    marginTop: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  statInsight: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  coachingCard: {
    marginTop: 14,
    padding: 16,
  },
  coachingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  coachingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachingSectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  coachingBody: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  coachingHint: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 19,
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
  panelFooter: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5EDF5',
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
