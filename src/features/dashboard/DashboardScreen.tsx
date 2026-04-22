import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen } from '../../components/layout/Screen';
import { ScreenTopCard } from '../../components/screenTop';
import { colors } from '../../theme/tokens';
import { MealCalorieProfileModal } from '../meals/components/MealCalorieProfileModal';
import { MEAL_PRIMARY } from '../meals/mealUiTheme';
import { LogHeartRateModal } from './components/LogHeartRateModal';
import {
  DASH_BAD,
  DASH_HEART,
  DASH_HEART_SOFT,
  DASH_MUTED,
  DASH_SLATE,
  EXERCISE_BAR,
  EXERCISE_BAR_TODAY,
  RING_CAL,
  RING_WATER,
} from './dashboardTokens';
import { useDashboardScreen } from './hooks/useDashboardScreen';
import { EXERCISE_RING_GOAL } from './hooks/useDashboardTodayMetrics';
import {
  formatHeartSourceLabel,
  formatRelativeHeartTime,
  waterRemainingFoot,
} from './utils/dashboardFormat';

/** Slight floor so calories / water tiles align with heart rate / weight half-cards. */
const DASHBOARD_TWIN_CARD_MIN_HEIGHT = 148;
/** Ring diameter in calories / water dashboard tiles. */
const DASHBOARD_METRIC_RING_SIZE = 44;

type DashboardStatPillTone = 'cal' | 'calOver' | 'water' | 'weight';

function DashboardStatPill({
  tone,
  children,
  numberOfLines = 2,
}: Readonly<{
  tone: DashboardStatPillTone;
  children: string;
  numberOfLines?: number;
}>) {
  const wrap: StyleProp<ViewStyle>[] = [styles.halfCardStatPill];
  const txt: StyleProp<TextStyle>[] = [styles.halfCardStatPillText];
  switch (tone) {
    case 'cal':
      wrap.push(styles.halfCardStatPillCal);
      txt.push(styles.halfCardStatPillTextCal);
      break;
    case 'calOver':
      wrap.push(styles.halfCardStatPillCalOver);
      txt.push(styles.halfCardStatPillTextCalOver);
      break;
    case 'water':
      wrap.push(styles.halfCardStatPillWater);
      txt.push(styles.halfCardStatPillTextWater);
      break;
    case 'weight':
      wrap.push(styles.halfCardStatPillWeight);
      txt.push(styles.halfCardStatPillTextWeight);
      break;
    default:
      break;
  }
  return (
    <View style={wrap}>
      <Text style={txt} numberOfLines={numberOfLines}>
        {children}
      </Text>
    </View>
  );
}

type SparkProps = Readonly<{
  points: (number | null)[];
  color: string;
}>;

function HeartSpark({ points, color }: SparkProps) {
  const w = 120;
  const h = 40;
  const nums = points.map(p => (p == null ? null : p));
  const defined = nums.filter((x): x is number => x != null);
  const minY = defined.length ? Math.min(...defined) - 5 : 50;
  const maxY = defined.length ? Math.max(...defined) + 5 : 100;
  const span = maxY - minY || 1;
  const stepX = w / (nums.length - 1 || 1);
  let d = '';
  nums.forEach((v, i) => {
    if (v == null) {
      return;
    }
    const x = i * stepX;
    const y = h - ((v - minY) / span) * (h - 4) - 2;
    d += d ? ` L ${x} ${y}` : `M ${x} ${y}`;
  });
  return (
    <Svg width={w} height={h}>
      <Line
        x1={0}
        y1={h - 1}
        x2={w}
        y2={h - 1}
        stroke={colors.border}
        strokeWidth={1}
      />
      {d ? (
        <Path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
}

type MetricRingWithIconProps = Readonly<{
  pct: number;
  color: string;
  icon: string;
  alert?: boolean;
  size?: number;
}>;

/** Progress ring with a centered icon; show amounts as text beside the ring. */
function MetricRingWithIcon({
  pct,
  color,
  icon,
  alert,
  size = 56,
}: MetricRingWithIconProps) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const dash = (clamped / 100) * circ;
  const ringColor = alert ? DASH_BAD : color;
  const iconColor = alert ? DASH_BAD : color;
  return (
    <View style={styles.miniRingWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke="#EEF2F6"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <View style={[styles.miniRingCenter, { width: size, height: size }]}>
        <Icon name={icon} size={Math.round(size * 0.42)} color={iconColor} />
      </View>
    </View>
  );
}

type ExerciseWeekBarsProps = Readonly<{
  values: ReadonlyArray<number>;
  labels: ReadonlyArray<string>;
  dayKeys: ReadonlyArray<string>;
  goalMinutes: number;
  todayIndex: number;
  /** Default 78; lower for a shorter Move card. */
  maxBarHeight?: number;
}>;

function ExerciseZigzagBg() {
  return (
    <Svg
      width={112}
      height={96}
      style={styles.exerciseZigzagSvg}
      pointerEvents="none"
    >
      <Path
        d="M -4 72 Q 22 28 48 64 T 108 52 L 116 96 L -8 96 Z"
        fill="#FFEDD5"
        opacity={0.45}
      />
    </Svg>
  );
}

/** Weekly move minutes as pill bars with a light dot at the top (reference UI). */
function ExerciseWeekBars({
  values,
  labels,
  dayKeys,
  goalMinutes,
  todayIndex,
  maxBarHeight = 78,
}: ExerciseWeekBarsProps) {
  const maxH = maxBarHeight;
  const barW = 11;
  const maxV = Math.max(1, goalMinutes, ...values);
  return (
    <View style={styles.exerciseBarsRow}>
      {values.map((v, i) => {
        const h = Math.max(10, Math.round((v / maxV) * maxH));
        const isToday = i === todayIndex;
        return (
          <View key={dayKeys[i] ?? `move-${i}`} style={styles.exerciseBarCol}>
            <View style={[styles.exerciseBarTrack, { height: maxH }]}>
              <View
                style={[
                  styles.exerciseBarFill,
                  {
                    width: barW,
                    height: h,
                    borderRadius: barW / 2,
                    backgroundColor: isToday
                      ? EXERCISE_BAR_TODAY
                      : EXERCISE_BAR,
                  },
                ]}
              >
                <View style={styles.exerciseBarDot} />
              </View>
            </View>
            <Text
              style={[
                styles.exerciseBarLbl,
                isToday && styles.exerciseBarLblToday,
              ]}
            >
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function DashboardScreen() {
  const {
    navigation,
    snapshot,
    loading,
    error,
    refresh,
    hrModal,
    setHrModal,
    weightModal,
    setWeightModal,
    onHrLogged,
    onWeightSaved,
    streakModel,
    reminders,
    insights,
    calPctRaw,
    calOverEarly,
    calPct,
    waterPct,
    moveExercise,
    exerciseToday,
    moveEstKcalToday,
    weightLabel,
    hrPoints,
    calOverAmt,
  } = useDashboardScreen();

  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'ios') {
        return undefined;
      }
      const id = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      });
      return () => cancelAnimationFrame(id);
    }, []),
  );

  return (
    <Screen
      applyTopSafeArea={false}
      applyBottomSafeArea={false}
      backgroundColor="#F8FAFC"
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && !!snapshot}
            onRefresh={() => void refresh()}
          />
        }
        contentContainerStyle={styles.scrollContent}
        {...(Platform.OS === 'ios'
          ? {
              contentInsetAdjustmentBehavior: 'never' as const,
              automaticallyAdjustsScrollIndicatorInsets: false,
              scrollIndicatorInsets: { top: 0, bottom: 0, left: 0, right: 0 },
            }
          : {})}
      >
        <View style={styles.body}>
          {loading && !snapshot ? (
            <View style={styles.centerLoad}>
              <ActivityIndicator size="large" color={MEAL_PRIMARY} />
              <Text style={styles.loadLabel}>Loading…</Text>
            </View>
          ) : null}

          {error && !snapshot ? (
            <View style={styles.errorCard}>
              <Icon
                name="alert-circle-outline"
                size={22}
                color={colors.error}
              />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => void refresh()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {snapshot && streakModel ? (
            <>
              <ScreenTopCard
                mode="streak"
                streak={{
                  days: streakModel.capsules,
                  currentStreak: streakModel.streak,
                  longestStreak: streakModel.longest,
                  todayOver: streakModel.todayOver,
                }}
              />

              <Text style={styles.ringsSectionTitle}>Today</Text>

              <View style={styles.metricPairRow}>
                <View style={styles.metricTileWrap}>
                  <Pressable
                    onPress={() => navigation.navigate('Meals')}
                    accessibilityRole="button"
                    accessibilityLabel="Calories, open meals"
                    style={({ pressed }) => [
                      styles.card,
                      styles.metricTile,
                      styles.metricTileCal,
                      styles.dashboardTwinCard,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.dashboardTwinCardInner}>
                      <View>
                        <View style={styles.cardIconRow}>
                          <MetricRingWithIcon
                            size={DASHBOARD_METRIC_RING_SIZE}
                            pct={calPct}
                            color={RING_CAL}
                            icon={calOverEarly ? 'fire-alert' : 'fire'}
                            alert={calOverEarly}
                          />
                          <Text style={styles.cardEyebrow}>Calories</Text>
                        </View>
                        <View style={styles.metricTileAmountRow}>
                          <Text
                            style={[
                              styles.metricTileAmount,
                              calOverEarly && styles.metricTileAmountWarn,
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}
                          >
                            {snapshot.todayCalories.toLocaleString('en-US')}
                          </Text>
                          <Text
                            style={[
                              styles.metricTileAmountUnit,
                              calOverEarly && styles.metricTileAmountWarn,
                            ]}
                            numberOfLines={1}
                          >
                            {' '}
                            kcal
                          </Text>
                        </View>
                        <Text
                          style={styles.metricTileHint}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          Goal {snapshot.calorieTarget.toLocaleString('en-US')}{' '}
                          kcal · {calPctRaw}%
                        </Text>
                      </View>
                      <View style={styles.metricStatPillOffset}>
                        <DashboardStatPill
                          tone={calOverEarly ? 'calOver' : 'cal'}
                        >
                          {calOverEarly
                            ? `${calOverAmt} kcal over goal`
                            : `${Math.max(
                                0,
                                snapshot.calorieTarget - snapshot.todayCalories,
                              ).toLocaleString('en-US')} kcal left`}
                        </DashboardStatPill>
                      </View>
                    </View>
                  </Pressable>
                </View>

                <View style={styles.metricTileWrap}>
                  <Pressable
                    onPress={() => navigation.navigate('Water')}
                    accessibilityRole="button"
                    accessibilityLabel="Water, open water log"
                    style={({ pressed }) => [
                      styles.card,
                      styles.metricTile,
                      styles.metricTileWater,
                      styles.dashboardTwinCard,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.dashboardTwinCardInner}>
                      <View>
                        <View style={styles.cardIconRow}>
                          <MetricRingWithIcon
                            size={DASHBOARD_METRIC_RING_SIZE}
                            pct={waterPct}
                            color={RING_WATER}
                            icon="cup-water"
                          />
                          <Text style={styles.cardEyebrow}>Water</Text>
                        </View>
                        <View style={styles.metricTileAmountRow}>
                          <Text
                            style={styles.metricTileAmount}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}
                          >
                            {(snapshot.waterTodayMl / 1000).toFixed(1)}
                          </Text>
                          <Text
                            style={styles.metricTileAmountUnit}
                            numberOfLines={1}
                          >
                            {' '}
                            L
                          </Text>
                        </View>
                        <Text
                          style={styles.metricTileHint}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          Goal {(snapshot.waterGoalMl / 1000).toFixed(1)} L ·{' '}
                          {waterPct}%
                        </Text>
                      </View>
                      <View style={styles.metricStatPillOffset}>
                        <DashboardStatPill tone="water">
                          {waterRemainingFoot(
                            snapshot.waterGoalMl,
                            snapshot.waterTodayMl,
                          )}
                        </DashboardStatPill>
                      </View>
                    </View>
                  </Pressable>
                </View>
              </View>

              <View
                style={[styles.card, styles.todayHeroCard, styles.moveCard]}
              >
                <View style={[styles.cardIconRow, styles.moveCardIconRow]}>
                  <View style={styles.exerciseIconBubble}>
                    <Icon
                      name="run-fast"
                      size={20}
                      color={EXERCISE_BAR_TODAY}
                    />
                  </View>
                  <Text style={styles.cardEyebrow}>Move</Text>
                </View>
                <View style={styles.exerciseBody}>
                  <View style={styles.exerciseCopy}>
                    <Text style={styles.todayHeroMetric}>
                      {exerciseToday} min today
                    </Text>
                    <Text style={styles.todayHeroSub}>
                      {EXERCISE_RING_GOAL} min goal · est. {moveEstKcalToday}{' '}
                      kcal
                    </Text>
                    <Text style={styles.todayHeroMicro}>
                      Week {moveExercise.weekTotalMin} min · ~
                      {moveExercise.estKcalWeek} kcal
                    </Text>
                  </View>
                  <View
                    style={[styles.exerciseChart, styles.exerciseChartCompact]}
                  >
                    <ExerciseZigzagBg />
                    <ExerciseWeekBars
                      values={moveExercise.values}
                      labels={moveExercise.labels}
                      dayKeys={moveExercise.dayKeys}
                      goalMinutes={EXERCISE_RING_GOAL}
                      todayIndex={moveExercise.todayIdx}
                      maxBarHeight={62}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.row2}>
                <Pressable
                  onPress={() => setHrModal(true)}
                  style={({ pressed }) => [
                    styles.card,
                    styles.cardHalf,
                    styles.dashboardTwinCard,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={styles.dashboardTwinCardInner}>
                    <View>
                      <View style={styles.cardIconRow}>
                        <View
                          style={[
                            styles.iconBubble,
                            { backgroundColor: DASH_HEART_SOFT },
                          ]}
                        >
                          <Icon
                            name="heart-pulse"
                            size={22}
                            color={DASH_HEART}
                          />
                        </View>
                        <Text style={styles.cardEyebrow}>Heart rate</Text>
                      </View>
                      {snapshot.heartLatest ? (
                        <>
                          <Text style={styles.hrBig}>
                            {snapshot.heartLatest.bpm}
                          </Text>
                          <Text style={styles.hrUnit}>
                            BPM · {formatHeartSourceLabel(snapshot.heartLatest.source)} ·{' '}
                            {formatRelativeHeartTime(
                              snapshot.heartLatest.recordedAt,
                            )}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.hrEmpty}>Tap to log</Text>
                          <Text style={styles.hrUnit}>Resting heart rate</Text>
                        </>
                      )}
                    </View>
                    <View style={styles.sparkRowTwin}>
                      <HeartSpark points={hrPoints} color={DASH_HEART} />
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setWeightModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Weight, update current and goal weight"
                  style={({ pressed }) => [
                    styles.card,
                    styles.cardHalf,
                    styles.dashboardTwinCard,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={styles.dashboardTwinCardInner}>
                    <View>
                      <View style={styles.cardIconRow}>
                        <View
                          style={[
                            styles.iconBubble,
                            { backgroundColor: '#E0E7FF' },
                          ]}
                        >
                          <Icon
                            name="scale-bathroom"
                            size={22}
                            color="#4F46E5"
                          />
                        </View>
                        <Text style={styles.cardEyebrow}>Weight</Text>
                      </View>
                      <Text style={styles.weightBig}>
                        {snapshot.profile.weightKg.toFixed(1)}
                        <Text style={styles.weightUnit}> kg</Text>
                      </Text>
                      <Text style={styles.weightGoal}>
                        Goal {snapshot.profile.goalWeightKg.toFixed(1)} kg
                      </Text>
                    </View>
                    <DashboardStatPill tone="weight">
                      {weightLabel}
                    </DashboardStatPill>
                  </View>
                </Pressable>
              </View>

              {reminders.length > 0 ? (
                <View style={styles.card}>
                  <View style={styles.remindersHead}>
                    <Icon
                      name="bell-ring-outline"
                      size={22}
                      color={DASH_SLATE}
                    />
                    <Text style={styles.remindersTitle}>Reminders</Text>
                  </View>
                  {reminders.map(r => (
                    <Pressable
                      key={r.key}
                      onPress={r.onPress}
                      disabled={!r.onPress}
                      style={({ pressed }) => [
                        styles.reminderRow,
                        pressed && r.onPress && styles.cardPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.reminderIcon,
                          { backgroundColor: `${r.color}18` },
                        ]}
                      >
                        <Icon name={r.icon} size={22} color={r.color} />
                      </View>
                      <View style={styles.reminderText}>
                        <Text style={styles.reminderTitle}>{r.title}</Text>
                        {r.subtitle ? (
                          <Text style={styles.reminderSub}>{r.subtitle}</Text>
                        ) : null}
                      </View>
                      {r.onPress ? (
                        <Icon
                          name="chevron-right"
                          size={20}
                          color={DASH_MUTED}
                        />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {insights.length > 0 ? (
                <View style={styles.card}>
                  <View style={styles.insightsHead}>
                    <Icon
                      name="lightbulb-on-outline"
                      size={22}
                      color={DASH_SLATE}
                    />
                    <Text style={styles.insightsTitle}>Insights & Feedback</Text>
                  </View>
                  {insights.map(row => (
                    <Pressable
                      key={row.key}
                      onPress={row.onPress}
                      disabled={!row.onPress}
                      style={({ pressed }) => [
                        styles.insightRow,
                        pressed && row.onPress && styles.cardPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.insightIcon,
                          { backgroundColor: `${row.color}18` },
                        ]}
                      >
                        <Icon name={row.icon} size={20} color={row.color} />
                      </View>
                      <Text style={styles.insightText}>{row.text}</Text>
                      {row.onPress ? (
                        <Icon
                          name="chevron-right"
                          size={20}
                          color={DASH_MUTED}
                        />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>

      <LogHeartRateModal
        visible={hrModal}
        onClose={() => setHrModal(false)}
        onLogged={onHrLogged}
      />
      <MealCalorieProfileModal
        visible={weightModal}
        profile={snapshot?.profile ?? null}
        onClose={() => setWeightModal(false)}
        onSave={onWeightSaved}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  hero: {
    backgroundColor: '#F8FAFC',
    marginBottom: 0,
  },
  heroInner: {
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 4,
    zIndex: 2,
  },
  heroKicker: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  heroSub: {
    fontSize: 12,
    fontWeight: '600',
    color: DASH_MUTED,
  },
  body: {
    paddingHorizontal: 18,
    gap: 12,
    paddingVertical: 12,
  },
  centerLoad: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  loadLabel: {
    fontSize: 14,
    color: DASH_MUTED,
    fontWeight: '600',
  },
  errorCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryBtn: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: MEAL_PRIMARY,
  },
  retryText: {
    color: colors.surface,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  cardHalf: {
    flex: 1,
    minWidth: 0,
  },
  ringsSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: DASH_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  miniRingWrap: {
    position: 'relative',
  },
  miniRingCenter: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricPairRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    gap: 12,
  },
  metricTileWrap: {
    flex: 1,
    minWidth: 0,
  },
  metricTile: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  metricTileCal: {
    backgroundColor: '#FFFBF7',
    borderColor: '#FDE68A',
  },
  metricTileWater: {
    backgroundColor: '#F5FAFF',
    borderColor: '#BAE6FD',
  },
  metricTileAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  metricTileAmount: {
    flexShrink: 1,
    fontSize: 28,
    fontWeight: '800',
    color: DASH_SLATE,
    letterSpacing: -0.5,
  },
  metricTileAmountUnit: {
    flexShrink: 0,
    fontSize: 16,
    fontWeight: '700',
    color: DASH_MUTED,
  },
  metricTileAmountWarn: {
    color: DASH_BAD,
  },
  metricTileHint: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: DASH_MUTED,
    lineHeight: 18,
  },
  metricStatPillOffset: {
    marginTop: 8,
  },
  halfCardStatPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  halfCardStatPillCal: {
    backgroundColor: '#FFEDD5',
  },
  halfCardStatPillCalOver: {
    backgroundColor: '#FEE2E2',
  },
  halfCardStatPillWater: {
    backgroundColor: '#E0F2FE',
  },
  halfCardStatPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  halfCardStatPillTextCal: {
    color: '#C2410C',
  },
  halfCardStatPillTextCalOver: {
    color: '#B91C1C',
  },
  halfCardStatPillTextWater: {
    color: '#0369A1',
  },
  halfCardStatPillWeight: {
    backgroundColor: '#EEF2FF',
  },
  halfCardStatPillTextWeight: {
    color: '#4338CA',
  },
  dashboardTwinCard: {
    minHeight: DASHBOARD_TWIN_CARD_MIN_HEIGHT,
  },
  dashboardTwinCardInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  todayHeroCard: {
    gap: 0,
  },
  moveCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  moveCardIconRow: {
    marginBottom: 6,
  },
  todayHeroMetric: {
    fontSize: 17,
    fontWeight: '700',
    color: DASH_SLATE,
    marginTop: 2,
  },
  todayHeroSub: {
    fontSize: 13,
    fontWeight: '600',
    color: DASH_MUTED,
    marginTop: 5,
    lineHeight: 18,
  },
  todayHeroMicro: {
    fontSize: 12,
    fontWeight: '600',
    color: DASH_MUTED,
    marginTop: 4,
  },
  exerciseIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 0,
  },
  exerciseCopy: {
    flex: 1,
    minWidth: 0,
  },
  exerciseChart: {
    width: 132,
    minHeight: 104,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 14,
    position: 'relative',
  },
  exerciseChartCompact: {
    minHeight: 86,
  },
  exerciseZigzagSvg: {
    position: 'absolute',
    right: -6,
    bottom: -4,
  },
  exerciseBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    paddingBottom: 2,
    zIndex: 1,
  },
  exerciseBarCol: {
    alignItems: 'center',
  },
  exerciseBarTrack: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  exerciseBarFill: {
    alignItems: 'center',
    paddingTop: 4,
    minHeight: 10,
  },
  exerciseBarDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  exerciseBarLbl: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: DASH_MUTED,
  },
  exerciseBarLblToday: {
    color: EXERCISE_BAR_TODAY,
  },
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: DASH_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  hrBig: {
    fontSize: 28,
    fontWeight: '800',
    color: DASH_SLATE,
    letterSpacing: -0.5,
  },
  hrUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: DASH_MUTED,
    marginTop: 2,
  },
  hrEmpty: {
    fontSize: 20,
    fontWeight: '700',
    color: DASH_HEART,
    marginTop: 2,
  },
  sparkRow: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  sparkRowTwin: {
    marginTop: 0,
    alignItems: 'flex-start',
  },
  weightBig: {
    fontSize: 28,
    fontWeight: '800',
    color: DASH_SLATE,
    letterSpacing: -0.5,
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: DASH_MUTED,
  },
  weightGoal: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: DASH_MUTED,
  },
  remindersHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  remindersTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DASH_SLATE,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  reminderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderText: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DASH_SLATE,
  },
  reminderSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: DASH_MUTED,
    lineHeight: 18,
  },
  insightsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  insightsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DASH_SLATE,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: DASH_SLATE,
    lineHeight: 20,
  },
});
