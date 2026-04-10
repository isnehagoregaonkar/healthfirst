import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen } from '../../components/layout/Screen';
import {
  addWaterIntake,
  DEFAULT_DAILY_GOAL_ML,
  getTodayTotalMl,
  getTotalMlForLocalDay,
} from '../../services/water';
import { colors } from '../../theme/tokens';
import { addCalendarDays, formatDayShort, getWaterDateNavLabels, startOfLocalDay } from './waterDayUtils';
import { WaterDropletProgress } from './WaterDropletProgress';

const QUICK_ADD_ML = [250, 500, 1000] as const;

const WATER_BLUE = '#3B82F6';
const WATER_TRACK = '#E5E7EB';

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

export function WaterIntakeScreen() {
  const goalMl = DEFAULT_DAILY_GOAL_ML;
  const [selectedDay, setSelectedDay] = useState(() => startOfLocalDay(new Date()));
  const [totalMl, setTotalMl] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { leftLabel, rightLabel, centerLabel, canGoNext, isViewingToday } = useMemo(
    () => getWaterDateNavLabels(selectedDay),
    [selectedDay],
  );

  const percent = useMemo(
    () => clampPct(goalMl > 0 ? (totalMl / goalMl) * 100 : 0),
    [totalMl, goalMl],
  );

  const leftMl = Math.max(0, goalMl - totalMl);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setTotalMl(0);
      setError(null);
      const result = await getTotalMlForLocalDay(selectedDay);
      if (!alive) {
        return;
      }
      if ('error' in result) {
        setError(result.error.message);
      } else {
        setTotalMl(result.totalMl);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [selectedDay]);

  const goPrevDay = useCallback(() => {
    setSelectedDay((d) => addCalendarDays(d, -1));
  }, []);

  const goNextDay = useCallback(() => {
    if (!canGoNext) {
      return;
    }
    setSelectedDay((d) => addCalendarDays(d, 1));
  }, [canGoNext]);

  const onAddMl = useCallback(
    async (ml: number) => {
      if (!isViewingToday) {
        return;
      }
      setError(null);
      const previous = totalMl;
      setTotalMl(previous + ml);
      setAdding(true);

      try {
        const result = await addWaterIntake(ml);
        if (!result.ok) {
          setTotalMl(previous);
          setError(result.error.message);
          return;
        }
        const refreshed = await getTodayTotalMl();
        if ('totalMl' in refreshed) {
          setTotalMl(refreshed.totalMl);
        } else {
          setError(refreshed.error.message);
          setTotalMl(previous);
        }
      } finally {
        setAdding(false);
      }
    },
    [totalMl, isViewingToday],
  );

  const progressTitle = isViewingToday
    ? "Today's progress"
    : `Progress · ${formatDayShort(selectedDay)}`;

  return (
    <Screen applyTopSafeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.dateCard}>
          <View style={styles.dateNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Go to ${leftLabel}`}
              onPress={goPrevDay}
              style={({ pressed }) => [styles.dateNavSide, pressed && styles.dateNavPressed]}
            >
              <Icon name="chevron-left" size={26} color={colors.primary} />
              <Text style={styles.dateNavSideText} numberOfLines={2}>
                {leftLabel}
              </Text>
            </Pressable>

            <View style={styles.dateNavCenter}>
              <Text style={styles.dateNavCenterText}>{centerLabel}</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Go to ${rightLabel}`}
              onPress={goNextDay}
              disabled={!canGoNext}
              style={({ pressed }) => [
                styles.dateNavSide,
                styles.dateNavSideEnd,
                !canGoNext && styles.dateNavDisabled,
                pressed && canGoNext && styles.dateNavPressed,
              ]}
            >
              <Text style={[styles.dateNavSideText, !canGoNext && styles.dateNavSideTextDisabled]} numberOfLines={2}>
                {rightLabel}
              </Text>
              <Icon
                name="chevron-right"
                size={26}
                color={canGoNext ? colors.primary : colors.border}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.progressCard}>
          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={WATER_BLUE} />
              <Text style={styles.loadingLabel}>Loading…</Text>
            </View>
          ) : (
            <>
              <View style={styles.progressTopRow}>
                <View style={styles.dropletCol}>
                  <WaterDropletProgress percent={percent} style={styles.dropletInner} />
                </View>
                <View style={styles.statsColumn}>
                  <View style={[styles.statCard, styles.statCardDone]}>
                    <View style={styles.statIconWrap}>
                      <Icon name="cup-water" size={20} color={WATER_BLUE} />
                    </View>
                    <Text style={styles.statLabel}>Drank</Text>
                    <Text style={styles.statValue}>{totalMl} ml</Text>
                  </View>
                  <View style={[styles.statCard, styles.statCardLeft]}>
                    <View style={styles.statIconWrap}>
                      <Icon name="water-minus" size={20} color="#D97706" />
                    </View>
                    <Text style={styles.statLabel}>Left</Text>
                    <Text style={[styles.statValue, leftMl === 0 && styles.statValueMuted]}>{leftMl} ml</Text>
                  </View>
                  <View style={[styles.statCard, styles.statCardGoal]}>
                    <View style={styles.statIconWrap}>
                      <Icon name="target" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.statLabel}>Goal</Text>
                    <Text style={styles.statValue}>{goalMl} ml</Text>
                  </View>
                </View>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.barRow}>
                  <Text style={styles.barTitle}>{progressTitle}</Text>
                  <Text style={styles.barPercent}>{Math.round(percent)}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${percent}%` }]} />
                </View>
                <Text style={styles.barCaption}>
                  {totalMl >= goalMl
                    ? 'Daily goal met'
                    : `${Math.round(100 - percent)}% of your goal still to go`}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.quickAddSection}>
          <Text style={styles.quickAddTitle}>Quick add</Text>
          <View style={styles.buttonsRow}>
            {QUICK_ADD_ML.map((ml) => (
              <Pressable
                key={ml}
                accessibilityRole="button"
                accessibilityLabel={`Add ${ml} milliliters`}
                disabled={adding || loading || !isViewingToday}
                onPress={() => void onAddMl(ml)}
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.addButtonPressed,
                  (adding || loading || !isViewingToday) && styles.addButtonDisabled,
                ]}
              >
                <Text style={styles.addButtonText}>+{ml} ml</Text>
              </Pressable>
            ))}
          </View>
          {adding ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={WATER_BLUE} />
            </View>
          ) : null}
          {isViewingToday ? null : (
            <Text style={styles.pastDayHint}>Switch to Today to log water.</Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const cardChrome = {
  backgroundColor: colors.surface,
  borderRadius: 16,
  padding: 18,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 28,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  dateCard: {
    ...cardChrome,
    marginBottom: 12,
    paddingVertical: 14,
  },
  progressCard: {
    ...cardChrome,
    marginBottom: 14,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  dateNavSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  dateNavSideEnd: {
    justifyContent: 'flex-end',
  },
  dateNavSideText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateNavSideTextDisabled: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dateNavCenter: {
    paddingHorizontal: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  dateNavCenterText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dateNavDisabled: {
    opacity: 0.85,
  },
  dateNavPressed: {
    opacity: 0.75,
  },
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 12,
  },
  loadingLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 20,
  },
  dropletCol: {
    flexBasis: '62%',
    maxWidth: '65%',
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dropletInner: {
    alignSelf: 'stretch',
  },
  statsColumn: {
    flex: 1,
    minWidth: 0,
    gap: 9,
    justifyContent: 'center',
    paddingLeft: 2,
  },
  statCard: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statCardDone: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statCardLeft: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statCardGoal: {
    backgroundColor: colors.primarySoft,
    borderColor: '#C8E6C9',
  },
  statIconWrap: {
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statValueMuted: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  progressSection: {
    marginTop: 0,
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  barTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    paddingRight: 8,
  },
  barPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: WATER_BLUE,
  },
  barCaption: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  barTrack: {
    height: 12,
    borderRadius: 8,
    backgroundColor: WATER_TRACK,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: WATER_BLUE,
  },
  quickAddSection: {
    paddingTop: 4,
  },
  quickAddTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  addButton: {
    flexGrow: 1,
    minWidth: '28%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonPressed: {
    opacity: 0.88,
  },
  addButtonDisabled: {
    opacity: 0.55,
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  inlineLoading: {
    marginTop: 10,
    alignItems: 'center',
  },
  pastDayHint: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
