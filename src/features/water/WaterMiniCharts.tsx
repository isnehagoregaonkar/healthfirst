import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';

export type DayTotalBar = Readonly<{
  date: Date;
  totalMl: number;
}>;

type CompareChartProps = Readonly<{
  /** When false, render only bars (title shown by parent). */
  showTitle?: boolean;
  title: string;
  leftLabel: string;
  rightLabel: string;
  leftMl: number;
  rightMl: number;
  goalMl: number;
}>;

function BarPair({
  showTitle = true,
  title,
  leftLabel,
  rightLabel,
  leftMl,
  rightMl,
  goalMl,
}: CompareChartProps) {
  const max = useMemo(() => Math.max(goalMl, leftMl, rightMl, 1), [goalMl, leftMl, rightMl]);
  const leftH = (leftMl / max) * 100;
  const rightH = (rightMl / max) * 100;

  return (
    <View style={styles.chartBlock}>
      {showTitle ? <Text style={styles.chartSectionTitle}>{title}</Text> : null}
      <View style={styles.compareBars}>
        <View style={styles.compareCol}>
          <View style={styles.compareTrack}>
            <View style={[styles.compareFill, styles.compareFillLeft, { height: `${leftH}%` }]} />
          </View>
          <Text style={styles.compareValue}>{leftMl} ml</Text>
          <Text style={styles.compareLabel} numberOfLines={2}>
            {leftLabel}
          </Text>
        </View>
        <View style={styles.compareCol}>
          <View style={styles.compareTrack}>
            <View style={[styles.compareFill, styles.compareFillRight, { height: `${rightH}%` }]} />
          </View>
          <Text style={styles.compareValue}>{rightMl} ml</Text>
          <Text style={styles.compareLabel} numberOfLines={2}>
            {rightLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

type WeekChartProps = Readonly<{
  days: DayTotalBar[];
  goalMl: number;
}>;

function WeekSpark({ days, goalMl }: WeekChartProps) {
  const max = useMemo(() => {
    const peak = days.reduce((m, d) => Math.max(m, d.totalMl), 0);
    return Math.max(peak, goalMl * 0.35, 1);
  }, [days, goalMl]);

  if (days.length === 0) {
    return null;
  }

  return (
    <View style={styles.chartBlock}>
      <Text style={styles.chartSectionTitle}>7-day trend</Text>
      <View style={styles.weekRow}>
        {days.map((d, i) => {
          const h = (d.totalMl / max) * 100;
          const letter = d.date.toLocaleDateString(undefined, { weekday: 'narrow' });
          const isLast = i === days.length - 1;
          return (
            <View key={d.date.getTime()} style={styles.weekCol}>
              <View style={styles.weekTrack}>
                <View style={[styles.weekFill, { height: `${h}%` }, isLast && styles.weekFillToday]} />
              </View>
              <Text style={[styles.weekLetter, isLast && styles.weekLetterToday]}>{letter}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export const WaterMiniCharts = {
  Compare: BarPair,
  Week: WeekSpark,
};

const CHART_ACCENT = '#3B82F6';
const CHART_ACCENT_SOFT = '#93C5FD';
const CHART_MUTED = '#CBD5E1';

const styles = StyleSheet.create({
  /** Matches screen section titles (Quick add, Intake timeline). */
  chartSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  chartBlock: {
    width: '100%',
  },
  compareBars: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-end',
  },
  compareCol: {
    flex: 1,
    alignItems: 'center',
  },
  compareTrack: {
    width: '100%',
    height: 88,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  compareFill: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minHeight: 4,
  },
  compareFillLeft: {
    backgroundColor: CHART_ACCENT,
  },
  compareFillRight: {
    backgroundColor: CHART_ACCENT_SOFT,
  },
  compareValue: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  compareLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
    paddingHorizontal: 2,
  },
  weekCol: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 44,
  },
  weekTrack: {
    width: '100%',
    height: 72,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  weekFill: {
    width: '100%',
    backgroundColor: CHART_MUTED,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  weekFillToday: {
    backgroundColor: CHART_ACCENT,
  },
  weekLetter: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  weekLetterToday: {
    color: CHART_ACCENT,
  },
});
