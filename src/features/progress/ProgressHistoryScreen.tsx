import React, { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppLoadingSpinner } from '../../components/feedback/AppLoadingSpinner';
import {
  Screen,
  SCREEN_HORIZONTAL_PADDING,
} from '../../components/layout/Screen';
import { colors } from '../../theme/tokens';
import { ProgressBarChart } from './components/ProgressBarChart';
import {
  useProgressHistoryScreen,
  type ProgressRangePreset,
} from './hooks/useProgressHistoryScreen';

const PRESET_OPTIONS: ReadonlyArray<{
  id: ProgressRangePreset;
  label: string;
}> = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All time' },
];

function formatDateShort(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatRangeLabel(start: Date, end: Date): string {
  return `${formatDateShort(start)} - ${formatDateShort(end)}`;
}

function compactNum(n: number): string {
  if (!Number.isFinite(n)) {
    return '0';
  }
  if (Math.abs(n) >= 1000) {
    return `${Math.round((n / 1000) * 10) / 10}k`;
  }
  return String(Math.round(n));
}

function formatDurationLabel(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) {
    return `${mins}m`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function healthTone(score: number): string {
  if (score >= 85) {
    return '#16A34A';
  }
  if (score >= 70) {
    return '#2563EB';
  }
  if (score >= 55) {
    return '#CA8A04';
  }
  return '#DC2626';
}

type HealthDonutSlice = Readonly<{
  value: number;
  color: string;
}>;

function HealthScoreDonut({
  score,
  slices,
}: Readonly<{ score: number; slices: HealthDonutSlice[] }>) {
  const size = 136;
  const stroke = 13;
  const c = size / 2;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const safeScore = Math.max(0, Math.min(100, score));
  let acc = 0;

  return (
    <View style={styles.healthDonutWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke="#E7EEF8"
          strokeWidth={stroke}
          fill="none"
        />
        {slices.map((slice, idx) => {
          const pct = Math.max(0, Math.min(100, slice.value));
          const seg = (pct / 100) * circ;
          const gap = Math.min(8, seg * 0.14);
          const dash = Math.max(0, seg - gap);
          const node = (
            <Circle
              key={`${slice.color}-${idx}`}
              cx={c}
              cy={c}
              r={r}
              stroke={slice.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-acc}
              strokeLinecap="round"
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
          acc += seg;
          return node;
        })}
      </Svg>
      <View style={styles.healthDonutCenter}>
        <Text style={[styles.healthDonutScore, { color: healthTone(safeScore) }]}>
          {safeScore}
        </Text>
        <Text style={styles.healthDonutOutOf}>/100</Text>
      </View>
    </View>
  );
}

export function ProgressHistoryScreen() {
  const {
    preset,
    setPreset,
    range,
    loading,
    error,
    refresh,
    dayRows,
    summary,
  } = useProgressHistoryScreen();

  const caloriesPoints = useMemo(
    () =>
      dayRows.map(row => ({
        label: formatDateShort(row.date),
        value: row.calories,
      })),
    [dayRows],
  );

  const waterPoints = useMemo(
    () =>
      dayRows.map(row => ({
        label: formatDateShort(row.date),
        value: row.waterMl,
      })),
    [dayRows],
  );

  const exercisePoints = useMemo(
    () =>
      dayRows.map(row => ({
        label: formatDateShort(row.date),
        value: row.exerciseKcal,
      })),
    [dayRows],
  );

  const highlights = useMemo(() => {
    const bestHydration = dayRows.reduce(
      (best, row) => (row.waterMl > best.waterMl ? row : best),
      dayRows[0] ?? {
        date: new Date(),
        waterMl: 0,
        calories: 0,
        exerciseKcal: 0,
        exerciseMinutes: 0,
        workouts: 0,
      },
    );
    return {
      avgCalories:
        summary.daysCount > 0
          ? compactNum(summary.caloriesTotal / summary.daysCount)
          : '0',
      avgWater:
        summary.daysCount > 0
          ? compactNum(summary.waterTotalMl / summary.daysCount)
          : '0',
      bestHydrationLabel:
        bestHydration.waterMl > 0
          ? `${formatDateShort(bestHydration.date)} • ${compactNum(
              bestHydration.waterMl,
            )} ml`
          : 'No hydration logs yet',
    };
  }, [dayRows, summary.caloriesTotal, summary.daysCount, summary.waterTotalMl]);
  const healthRows = useMemo(
    () => [
      {
        id: 'nutrition',
        label: 'Nutrition',
        value: summary.healthScore.breakdown.nutrition,
        color: '#1B5E20',
        weight: 0.3,
      },
      {
        id: 'hydration',
        label: 'Hydration',
        value: summary.healthScore.breakdown.hydration,
        color: '#2E7D32',
        weight: 0.2,
      },
      {
        id: 'activity',
        label: 'Activity',
        value: summary.healthScore.breakdown.activity,
        color: '#66BB6A',
        weight: 0.3,
      },
      {
        id: 'consistency',
        label: 'Consistency',
        value: summary.healthScore.breakdown.consistency,
        color: '#C8E6C9',
        weight: 0.2,
      },
    ],
    [summary.healthScore.breakdown],
  );
  const healthDonutSlices = useMemo(() => {
    const weighted = healthRows.map(row => ({
      color: row.color,
      points: Math.max(0, row.value) * row.weight,
    }));
    const total = weighted.reduce((acc, row) => acc + row.points, 0);
    if (total <= 0) {
      return weighted.map(row => ({ color: row.color, value: 0 }));
    }
    return weighted.map(row => ({
      color: row.color,
      value: (row.points / total) * 100,
    }));
  }, [healthRows]);

  if (loading && dayRows.length === 0 && !error) {
    return (
      <Screen applyTopSafeArea={false}>
        <View style={styles.fullCenterLoad}>
          <AppLoadingSpinner title="Loading your trends..." />
        </View>
      </Screen>
    );
  }

  return (
    <Screen applyTopSafeArea={false}>
      <View style={styles.screenBody}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          }
        >
          <View style={styles.filterWrap}>
            {PRESET_OPTIONS.map(item => {
              const active = item.id === preset;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setPreset(item.id)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

        <View style={styles.rangeCard}>
          <Text style={styles.rangeTitle}>Selected range</Text>
          <Text style={styles.rangeValue}>
            {formatRangeLabel(range.start, range.end)}
          </Text>
        </View>

        <View style={styles.healthScoreCard}>
          <View style={styles.healthScoreAura} />
          <Text style={styles.healthScoreTitle}>Health score</Text>
          <View style={styles.healthScoreHeader}>
            <View style={styles.healthTopLeft}>
              <HealthScoreDonut
                score={summary.healthScore.score}
                slices={healthDonutSlices}
              />
              <Text style={styles.healthScoreLabel}>{summary.healthScore.label}</Text>
            </View>

            <View style={styles.healthLegendWrap}>
              {healthRows.map(row => (
                <View key={row.id} style={styles.healthLegendRow}>
                  <View
                    style={[
                      styles.healthLegendDot,
                      { backgroundColor: row.color },
                    ]}
                  />
                  <Text style={styles.healthLegendLabel}>{row.label}</Text>
                  <Text style={styles.healthLegendValue}>
                    {row.value}% · {Math.round(row.weight * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={styles.healthHint}>{summary.healthScore.hint}</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Meal calories</Text>
            <Text style={styles.summaryValue}>
              {compactNum(summary.caloriesTotal)} kcal
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Water intake</Text>
            <Text style={styles.summaryValue}>
              {compactNum(summary.waterTotalMl)} ml
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Exercise burn</Text>
            <Text style={styles.summaryValue}>
              {compactNum(summary.exerciseKcalTotal)} kcal
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Fasting</Text>
            <Text style={styles.summaryValue}>
              {summary.fastingSessions} sessions /{' '}
              {formatDurationLabel(summary.fastingMinutesTotal)}
            </Text>
          </View>
        </View>

        <View style={styles.goalCard}>
          <Text style={styles.goalTitle}>Goals reached</Text>
          <View style={styles.goalGrid}>
            <View style={styles.goalMiniCard}>
              <Text style={styles.goalMiniLabel}>Meal calories</Text>
              <Text style={styles.goalMiniValue}>
                {summary.mealGoalHitDays}/{summary.daysCount}
              </Text>
            </View>
            <View style={styles.goalMiniCard}>
              <Text style={styles.goalMiniLabel}>Water intake</Text>
              <Text style={styles.goalMiniValue}>
                {summary.waterGoalHitDays}/{summary.daysCount}
              </Text>
            </View>
            <View style={styles.goalMiniCard}>
              <Text style={styles.goalMiniLabel}>Exercise minutes</Text>
              <Text style={styles.goalMiniValue}>
                {summary.exerciseGoalHitDays}/{summary.daysCount}
              </Text>
            </View>
          </View>
        </View>

        <ProgressBarChart
          title="Calories trend"
          color="#FB923C"
          points={caloriesPoints}
          unit="kcal"
        />
        <ProgressBarChart
          title="Water trend"
          color="#38BDF8"
          points={waterPoints}
          unit="ml"
        />
        <ProgressBarChart
          title="Exercise burn trend"
          color="#8B5CF6"
          points={exercisePoints}
          unit="kcal"
        />

        <View style={styles.footerCard}>
            <Text style={styles.footerTitle}>Highlights</Text>
            <View style={styles.highlightRow}>
              <View style={styles.highlightPill}>
                <Text style={styles.highlightPillLabel}>Daily avg calories</Text>
                <Text style={styles.highlightPillValue}>
                  {highlights.avgCalories} kcal
                </Text>
              </View>
              <View style={styles.highlightPill}>
                <Text style={styles.highlightPillLabel}>Daily avg water</Text>
                <Text style={styles.highlightPillValue}>
                  {highlights.avgWater} ml
                </Text>
              </View>
            </View>
            <View style={styles.highlightRow}>
              <View style={styles.highlightPill}>
                <Text style={styles.highlightPillLabel}>Workouts logged</Text>
                <Text style={styles.highlightPillValue}>
                  {summary.workoutsTotal}
                </Text>
              </View>
              <View style={styles.highlightPill}>
                <Text style={styles.highlightPillLabel}>Total fasting</Text>
                <Text style={styles.highlightPillValue}>
                  {formatDurationLabel(summary.fastingMinutesTotal)}
                </Text>
              </View>
            </View>
            <View style={styles.highlightCallout}>
              <Text style={styles.highlightCalloutTitle}>Best hydration day</Text>
              <Text style={styles.highlightCalloutText}>
                {highlights.bestHydrationLabel}
              </Text>
            </View>
        </View>
        </ScrollView>

        {loading && dayRows.length > 0 ? (
          <View style={styles.loadingOverlay}>
            <AppLoadingSpinner title="Loading your trends..." />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
  },
  screenBody: {
    flex: 1,
  },
  filterWrap: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  filterChip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  rangeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CFE8D1',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rangeTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rangeValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  healthScoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE9F7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  healthScoreAura: {
    position: 'absolute',
    right: -28,
    top: -24,
    width: 148,
    height: 148,
    borderRadius: 999,
    backgroundColor: '#DBEAFE66',
  },
  healthScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  healthTopLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScoreTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#64748B',
  },
  healthScoreLabel: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  healthDonutWrap: {
    position: 'relative',
  },
  healthDonutCenter: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 136,
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  healthDonutScore: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  healthDonutOutOf: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 6,
  },
  healthLegendWrap: {
    flex: 1,
    gap: 8,
    marginTop: 4,
  },
  healthLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFFAA',
    borderWidth: 1,
    borderColor: '#E5EEF9',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  healthLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  healthLegendLabel: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '700',
  },
  healthLegendValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  healthHint: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    lineHeight: 17,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: '#991B1B',
    fontWeight: '700',
  },
  fullCenterLoad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFCDD',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '800',
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFE8D1',
    borderRadius: 16,
    padding: 14,
  },
  goalTitle: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '800',
  },
  goalGrid: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  goalMiniCard: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFE8D1',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  goalMiniLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  goalMiniValue: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: '900',
    color: colors.primary,
  },
  footerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFE8D1',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
  },
  highlightRow: {
    flexDirection: 'row',
    gap: 8,
  },
  highlightPill: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFE8D1',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  highlightPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  highlightPillValue: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '900',
    color: colors.primary,
  },
  highlightCallout: {
    marginTop: 4,
    backgroundColor: '#F8FBF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0EFE1',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  highlightCalloutTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E7D32',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  highlightCalloutText: {
    marginTop: 4,
    fontSize: 12,
    color: '#14532D',
    fontWeight: '800',
  },
});
