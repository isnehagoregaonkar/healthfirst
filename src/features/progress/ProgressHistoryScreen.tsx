import React, { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppLoadingSpinner } from '../../components/feedback/AppLoadingSpinner';
import { Screen, SCREEN_HORIZONTAL_PADDING } from '../../components/layout/Screen';
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
      dayRows[0] ?? { date: new Date(), waterMl: 0, calories: 0, exerciseKcal: 0, exerciseMinutes: 0, workouts: 0 },
    );
    return {
      avgCalories:
        summary.daysCount > 0 ? compactNum(summary.caloriesTotal / summary.daysCount) : '0',
      avgWater:
        summary.daysCount > 0 ? compactNum(summary.waterTotalMl / summary.daysCount) : '0',
      bestHydrationLabel:
        bestHydration.waterMl > 0
          ? `${formatDateShort(bestHydration.date)} • ${compactNum(bestHydration.waterMl)} ml`
          : 'No hydration logs yet',
    };
  }, [dayRows, summary.caloriesTotal, summary.daysCount, summary.waterTotalMl]);

  return (
    <Screen applyTopSafeArea={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
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
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rangeCard}>
          <Text style={styles.rangeTitle}>Selected range</Text>
          <Text style={styles.rangeValue}>{formatRangeLabel(range.start, range.end)}</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading && dayRows.length === 0 ? (
          <View style={styles.loaderWrap}>
            <AppLoadingSpinner title="Loading your trends..." color={colors.accent} />
          </View>
        ) : null}

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Meal calories</Text>
            <Text style={styles.summaryValue}>{compactNum(summary.caloriesTotal)} kcal</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Water intake</Text>
            <Text style={styles.summaryValue}>{compactNum(summary.waterTotalMl)} ml</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Exercise burn</Text>
            <Text style={styles.summaryValue}>{compactNum(summary.exerciseKcalTotal)} kcal</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Fasting</Text>
            <Text style={styles.summaryValue}>
              {summary.fastingSessions} sessions /{' '}
              {formatDurationLabel(summary.fastingHoursTotal * 60)}
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
              <Text style={styles.highlightPillValue}>{highlights.avgCalories} kcal</Text>
            </View>
            <View style={styles.highlightPill}>
              <Text style={styles.highlightPillLabel}>Daily avg water</Text>
              <Text style={styles.highlightPillValue}>{highlights.avgWater} ml</Text>
            </View>
          </View>
          <View style={styles.highlightRow}>
            <View style={styles.highlightPill}>
              <Text style={styles.highlightPillLabel}>Workouts logged</Text>
              <Text style={styles.highlightPillValue}>{summary.workoutsTotal}</Text>
            </View>
            <View style={styles.highlightPill}>
              <Text style={styles.highlightPillLabel}>Total fasting</Text>
              <Text style={styles.highlightPillValue}>
                {formatDurationLabel(summary.fastingHoursTotal * 60)}
              </Text>
            </View>
          </View>
          <View style={styles.highlightCallout}>
            <Text style={styles.highlightCalloutTitle}>Best hydration day</Text>
            <Text style={styles.highlightCalloutText}>{highlights.bestHydrationLabel}</Text>
          </View>
        </View>

      </ScrollView>
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
  loaderWrap: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
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
