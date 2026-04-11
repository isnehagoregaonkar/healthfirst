/** Copy + light heuristics for the water screen (today-only pacing). */

import { clampWaterPercent } from './waterDayUtils';

export type WaterCoachingKind = 'almostThere' | 'behindSchedule' | 'goalMet';

export type WaterCoachingLine = Readonly<{
  kind: WaterCoachingKind;
  title: string;
  subtitle?: string;
}>;

function minutesSinceLocalMidnight(now: Date): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.max(0, (now.getTime() - start.getTime()) / 60_000);
}

/**
 * Rough “expected” completion by time of day (linear across waking hours).
 * Used only to nudge when viewing today.
 */
/** True when today’s water % is behind a simple time-of-day pace (same rule as water screen). */
export function isWaterBehindSchedule(percent: number, now: Date = new Date()): boolean {
  const mins = minutesSinceLocalMidnight(now);
  if (mins < 4 * 60) {
    return false;
  }
  const dayProgress = Math.min(1, mins / (24 * 60));
  const expectedPct = dayProgress * 100;
  return percent < expectedPct - 18 && percent < 100;
}

export function getWaterCoachingLines(
  percent: number,
  isViewingToday: boolean,
  now: Date = new Date(),
): WaterCoachingLine[] {
  const p = clampWaterPercent(percent);
  const lines: WaterCoachingLine[] = [];

  if (p >= 100) {
    lines.push({
      kind: 'goalMet',
      title: 'Daily goal met — nice work.',
    });
    return lines;
  }

  if (p >= 75) {
    lines.push({
      kind: 'almostThere',
      title: 'Great job! Almost there 💧',
      subtitle: `${Math.round(100 - p)}% left to your goal.`,
    });
  }

  if (isViewingToday && isWaterBehindSchedule(p, now)) {
    lines.push({
      kind: 'behindSchedule',
      title: "You're behind schedule",
      subtitle: 'A glass now will help you catch up.',
    });
  }

  return lines;
}
