import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen } from '../../components/layout/Screen';
import { useDrawerUserProfile } from '../../navigation/hooks/useDrawerUserProfile';
import type { MainTabParamList } from '../../navigation/types';
import { addHeartRateReading } from '../../services/vitals';
import { colors } from '../../theme/tokens';
import { MEAL_PRIMARY } from '../meals/mealUiTheme';
import { isWaterBehindSchedule } from '../water/waterCoaching';
import type { StreakCapsuleTone } from './components/StreakPanel';
import { StreakPanel } from './components/StreakPanel';
import { useDashboardData } from './hooks/useDashboardData';

const DASH_SLATE = '#0F172A';
const DASH_MUTED = '#64748B';
const DASH_HEART = '#E11D48';
const DASH_HEART_SOFT = '#FFE4E9';
const DASH_WATER = '#0284C7';
/** Ring accents for Today hero cards */
const RING_CAL = '#F97316';
const RING_WATER = '#06B6D4';
const EXERCISE_BAR = '#FF7A18';
const EXERCISE_BAR_TODAY = '#EA580C';
const DASH_BAD = '#EF4444';
const DASH_EXERCISE = '#8B5CF6';
/** Preview “minutes” per day for move row until exercise ships (index 6 = today). */
const EXERCISE_DUMMY = [18, 32, 45, 28, 52, 36, 22];
const EXERCISE_STREAK_MIN = 25;
const EXERCISE_RING_GOAL = 30;

/** Slight floor so calories / water tiles align with heart rate / weight half-cards. */
const DASHBOARD_TWIN_CARD_MIN_HEIGHT = 158;
/** Ring diameter in calories / water dashboard tiles (matches visual weight of icon bubbles). */
const DASHBOARD_METRIC_RING_SIZE = 52;

type TabNav = BottomTabNavigationProp<MainTabParamList>;

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

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) {
    return 'Good morning';
  }
  if (h < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

function formatWeekdayShort(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function waterRemainingFoot(goalMl: number, todayMl: number): string {
  const rem = Math.max(0, goalMl - todayMl);
  if (rem <= 0) {
    return 'Daily goal reached';
  }
  if (rem >= 1000) {
    return `${(rem / 1000).toFixed(1)} L to go`;
  }
  return `${rem.toLocaleString('en-US')} ml to go`;
}

function formatRelativeHeartTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
    if (mins < 1) {
      return 'Just now';
    }
    if (mins < 60) {
      return `${mins}m ago`;
    }
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
        <Icon
          name={icon}
          size={Math.round(size * 0.42)}
          color={iconColor}
        />
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
}: ExerciseWeekBarsProps) {
  const maxH = 78;
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

type LogHeartRateModalProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  onLogged: () => void;
}>;

function LogHeartRateModal({
  visible,
  onClose,
  onLogged,
}: LogHeartRateModalProps) {
  const [bpm, setBpm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setErr(null);
    const n = Number.parseInt(bpm.replaceAll(/\s/g, ''), 10);
    if (!Number.isFinite(n)) {
      setErr('Enter a whole number.');
      return;
    }
    setBusy(true);
    const r = await addHeartRateReading(n);
    setBusy(false);
    if (!r.ok) {
      setErr(r.error.message);
      return;
    }
    setBpm('');
    onLogged();
    onClose();
  }, [bpm, onClose, onLogged]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.modalScrim}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View style={styles.modalCenter} pointerEvents="box-none">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log heart rate</Text>
            <Text style={styles.modalHint}>Resting BPM (35–220)</Text>
            <TextInput
              value={bpm}
              onChangeText={setBpm}
              keyboardType="number-pad"
              placeholder="e.g. 68"
              placeholderTextColor={DASH_MUTED}
              style={styles.modalInput}
            />
            {err ? <Text style={styles.modalErr}>{err}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable onPress={onClose} style={styles.modalGhost}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => submit().catch(() => {})}
                disabled={busy}
                style={[
                  styles.modalPrimary,
                  busy && styles.modalPrimaryDisabled,
                ]}
              >
                <Text style={styles.modalPrimaryText}>
                  {busy ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function dayHasLog(day: { mealCount: number; totalCalories: number }): boolean {
  return day.mealCount > 0 || day.totalCalories > 0;
}

function streakToneForDay(
  day: { mealCount: number; totalCalories: number },
  calorieTarget: number,
  isFuture: boolean,
): StreakCapsuleTone {
  if (isFuture) {
    return 'future';
  }
  if (!dayHasLog(day)) {
    return 'missed';
  }
  const k = day.totalCalories;
  const target = Math.max(calorieTarget, 1);
  if (k > target) {
    return 'over';
  }
  if (k <= 0) {
    return 'warn';
  }
  return 'good';
}

/** Consecutive days (from today backward) with any meal logged that day. */
function computeMealLogStreak(
  mealWeek: ReadonlyArray<{ mealCount: number; totalCalories: number }>,
): number {
  let n = 0;
  for (let i = mealWeek.length - 1; i >= 0; i -= 1) {
    if (dayHasLog(mealWeek[i])) {
      n += 1;
    } else {
      break;
    }
  }
  return n;
}

function longestMealLogRunInWeek(
  mealWeek: ReadonlyArray<{ mealCount: number; totalCalories: number }>,
): number {
  let best = 0;
  let cur = 0;
  for (const d of mealWeek) {
    if (dayHasLog(d)) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

export function DashboardScreen() {
  const navigation = useNavigation<TabNav>();
  const user = useDrawerUserProfile();
  const { snapshot, loading, error, refresh } = useDashboardData();
  const [hrModal, setHrModal] = useState(false);
  const { width: winW } = useWindowDimensions();

  const onHrLogged = useCallback(() => {
    void refresh();
  }, [refresh]);

  const streakModel = useMemo(() => {
    if (!snapshot) {
      return null;
    }
    const { mealWeek, calorieTarget } = snapshot;
    const n = mealWeek.length;
    const todayIdx = n - 1;
    const todayDay = mealWeek[todayIdx];
    const todayOver =
      dayHasLog(todayDay) &&
      todayDay.totalCalories > Math.max(calorieTarget, 1);

    const capsules = mealWeek.map((day, i) => ({
      id: localDayKey(day.date),
      label: formatWeekdayShort(day.date),
      isToday: i === todayIdx,
      tone: streakToneForDay(day, calorieTarget, i > todayIdx),
    }));

    return {
      capsules,
      streak: computeMealLogStreak(mealWeek),
      longest: longestMealLogRunInWeek(mealWeek),
      todayOver,
    };
  }, [snapshot]);

  const calPctRaw = snapshot
    ? Math.round(
        (snapshot.todayCalories / Math.max(snapshot.calorieTarget, 1)) * 100,
      )
    : 0;
  const calOverEarly = snapshot
    ? snapshot.todayCalories > snapshot.calorieTarget
    : false;
  const calPct = calOverEarly ? 100 : Math.min(100, calPctRaw);
  const waterPct = snapshot
    ? Math.min(
        100,
        Math.round(
          (snapshot.waterTodayMl / Math.max(snapshot.waterGoalMl, 1)) * 100,
        ),
      )
    : 0;
  const moveExercise = useMemo(() => {
    if (!snapshot) {
      return {
        values: [] as number[],
        labels: [] as string[],
        dayKeys: [] as string[],
        todayIdx: 0,
        weekTotalMin: 0,
        estKcalWeek: 0,
      };
    }
    const mw = snapshot.mealWeek;
    const values = mw.map((_, i) => EXERCISE_DUMMY[i] ?? 0);
    const labels = mw.map(d => formatWeekdayShort(d.date).charAt(0));
    const dayKeys = mw.map(d => localDayKey(d.date));
    const todayIdx = Math.max(0, mw.length - 1);
    const weekTotalMin = values.reduce((a, b) => a + b, 0);
    return {
      values,
      labels,
      dayKeys,
      todayIdx,
      weekTotalMin,
      estKcalWeek: Math.round(weekTotalMin * 7.5),
    };
  }, [snapshot]);

  const exerciseToday = snapshot
    ? moveExercise.values[moveExercise.todayIdx] ?? 0
    : 0;
  const moveEstKcalToday = Math.round(exerciseToday * 7.5);

  const weightDelta =
    snapshot != null
      ? snapshot.profile.weightKg - snapshot.profile.goalWeightKg
      : 0;
  const weightLabel =
    snapshot == null
      ? ''
      : Math.abs(weightDelta) < 0.15
      ? 'On target'
      : weightDelta > 0
      ? `${weightDelta.toFixed(1)} kg to goal`
      : `${Math.abs(weightDelta).toFixed(1)} kg above goal`;

  const hrPoints = snapshot?.heartWeek.map(d => d.avgBpm) ?? [];

  const reminders = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    const out: {
      key: string;
      icon: string;
      title: string;
      subtitle?: string;
      color: string;
      onPress?: () => void;
    }[] = [];

    if (isWaterBehindSchedule(waterPct, new Date())) {
      out.push({
        key: 'water',
        icon: 'cup-water',
        title: 'Water is behind schedule',
        subtitle: 'Catch up with a glass — tap to log water.',
        color: DASH_WATER,
        onPress: () => navigation.navigate('Water'),
      });
    }

    if (snapshot.todayCalories > snapshot.calorieTarget) {
      const over = snapshot.todayCalories - snapshot.calorieTarget;
      out.push({
        key: 'cal',
        icon: 'fire-alert',
        title: 'Over calorie target',
        subtitle: `${over} kcal above today’s plan. Consider lighter choices tomorrow.`,
        color: DASH_BAD,
        onPress: () => navigation.navigate('Meals'),
      });
    }

    const hour = new Date().getHours();
    if (hour >= 17 && exerciseToday < EXERCISE_STREAK_MIN) {
      out.push({
        key: 'move',
        icon: 'run-fast',
        title: 'Evening movement',
        subtitle:
          'Exercise tracking is coming soon — a short walk still counts for today.',
        color: DASH_EXERCISE,
      });
    }

    return out;
  }, [snapshot, waterPct, navigation, exerciseToday]);

  const calOverAmt = snapshot
    ? snapshot.todayCalories - snapshot.calorieTarget
    : 0;

  return (
    <Screen
      applyTopSafeArea={false}
      applyBottomSafeArea={false}
      backgroundColor="#F8FAFC"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && !!snapshot}
            onRefresh={() => void refresh()}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.hero, { width: winW }]}>
          <Svg
            style={StyleSheet.absoluteFill}
            width={winW}
            height={86}
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id="heroWash" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#D1FAE5" stopOpacity={0.85} />
                <Stop offset="1" stopColor="#F8FAFC" stopOpacity={0.15} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={winW} height={86} fill="url(#heroWash)" />
          </Svg>
          <View style={styles.heroInner}>
            <Text style={styles.heroKicker}>
              {greetingForNow()}, {user?.name ?? 'there'}
            </Text>
            <Text style={styles.heroSub}>Goals · pull to refresh</Text>
          </View>
        </View>

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
              <View style={styles.card}>
                <Text style={styles.streakScreenTitle}>Streaks</Text>
                <Text style={styles.streakScreenHint}>
                  Any logged meal counts for the streak · colors follow calories
                  vs your daily target
                </Text>
                <StreakPanel
                  days={streakModel.capsules}
                  currentStreak={streakModel.streak}
                  longestStreak={streakModel.longest}
                  todayOver={streakModel.todayOver}
                />
              </View>

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
                          Goal{' '}
                          {snapshot.calorieTarget.toLocaleString('en-US')} kcal ·{' '}
                          {calPctRaw}%
                        </Text>
                      </View>
                      <DashboardStatPill
                        tone={calOverEarly ? 'calOver' : 'cal'}
                      >
                        {calOverEarly
                          ? `${calOverAmt} kcal over goal`
                          : `${Math.max(
                              0,
                              snapshot.calorieTarget -
                                snapshot.todayCalories,
                            ).toLocaleString('en-US')} kcal left`}
                      </DashboardStatPill>
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
                      <DashboardStatPill tone="water">
                        {waterRemainingFoot(
                          snapshot.waterGoalMl,
                          snapshot.waterTodayMl,
                        )}
                      </DashboardStatPill>
                    </View>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.card, styles.todayHeroCard]}>
                <View style={styles.cardIconRow}>
                  <View style={styles.exerciseIconBubble}>
                    <Icon name="run-fast" size={22} color={EXERCISE_BAR_TODAY} />
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
                  <View style={styles.exerciseChart}>
                    <ExerciseZigzagBg />
                    <ExerciseWeekBars
                      values={moveExercise.values}
                      labels={moveExercise.labels}
                      dayKeys={moveExercise.dayKeys}
                      goalMinutes={EXERCISE_RING_GOAL}
                      todayIndex={moveExercise.todayIdx}
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
                            BPM ·{' '}
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

                <View
                  style={[styles.card, styles.cardHalf, styles.dashboardTwinCard]}
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
                    <DashboardStatPill tone="weight">{weightLabel}</DashboardStatPill>
                  </View>
                </View>
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
            </>
          ) : null}
        </View>
      </ScrollView>

      <LogHeartRateModal
        visible={hrModal}
        onClose={() => setHrModal(false)}
        onLogged={onHrLogged}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  hero: {
    minHeight: 72,
    marginBottom: 4,
  },
  heroInner: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
    zIndex: 2,
  },
  heroKicker: {
    fontSize: 20,
    fontWeight: '800',
    color: DASH_SLATE,
    letterSpacing: -0.4,
  },
  heroSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: DASH_MUTED,
  },
  body: {
    paddingHorizontal: 18,
    gap: 12,
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
  streakScreenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DASH_SLATE,
    marginBottom: 4,
  },
  streakScreenHint: {
    fontSize: 12,
    fontWeight: '600',
    color: DASH_MUTED,
    marginBottom: 12,
  },
  ringsSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: DASH_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 2,
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
  todayHeroMetric: {
    fontSize: 17,
    fontWeight: '700',
    color: DASH_SLATE,
    marginTop: 4,
  },
  todayHeroSub: {
    fontSize: 13,
    fontWeight: '600',
    color: DASH_MUTED,
    marginTop: 8,
    lineHeight: 18,
  },
  todayHeroMicro: {
    fontSize: 12,
    fontWeight: '600',
    color: DASH_MUTED,
    marginTop: 6,
  },
  exerciseIconBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 2,
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
  modalRoot: {
    flex: 1,
  },
  modalScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCenter: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DASH_SLATE,
  },
  modalHint: {
    marginTop: 6,
    fontSize: 13,
    color: DASH_MUTED,
    fontWeight: '600',
  },
  modalInput: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: DASH_SLATE,
    backgroundColor: '#F8FAFC',
  },
  modalErr: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
  },
  modalGhost: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalGhostText: {
    fontSize: 16,
    fontWeight: '700',
    color: DASH_MUTED,
  },
  modalPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: DASH_HEART,
  },
  modalPrimaryDisabled: {
    opacity: 0.5,
  },
  modalPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
});
