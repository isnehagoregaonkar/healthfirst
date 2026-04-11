import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
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
import { suggestedDailyProteinGrams } from '../../services/mealCalorieTarget';
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
const DASH_CAL = '#D97706';
const DASH_OK = '#22C55E';
const DASH_WARN = '#F59E0B';
const DASH_BAD = '#EF4444';
const DASH_EXERCISE = '#8B5CF6';
/** Preview “minutes” per day for move row until exercise ships (index 6 = today). */
const EXERCISE_DUMMY = [18, 32, 45, 28, 52, 36, 22];
const EXERCISE_STREAK_MIN = 25;
const EXERCISE_RING_GOAL = 30;

type TabNav = BottomTabNavigationProp<MainTabParamList>;

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

type ProgressRingProps = Readonly<{
  size: number;
  pct: number;
  color: string;
  label: string;
  valueLine: string;
  subLine?: string;
  alert?: boolean;
}>;

function ProgressRing({
  size,
  pct,
  color,
  label,
  valueLine,
  subLine,
  alert,
}: ProgressRingProps) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const dash = (clamped / 100) * circ;
  const ringColor = alert ? DASH_BAD : color;
  return (
    <View style={styles.ringCol}>
      <Svg width={size} height={size}>
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke="#E2E8F0"
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
      <View style={[styles.ringCenter, { width: size, height: size }]}>
        <Text
          style={[styles.ringValue, alert && styles.ringValueAlert]}
          numberOfLines={2}
        >
          {valueLine}
        </Text>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
      {subLine ? <Text style={styles.ringSub}>{subLine}</Text> : null}
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

  const ringSize = Math.min(108, Math.floor((winW - 18 * 2 - 24) / 3));

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
  const exerciseToday = EXERCISE_DUMMY[6] ?? 0;
  const exercisePct = Math.min(
    100,
    Math.round((exerciseToday / EXERCISE_RING_GOAL) * 100),
  );

  const proteinGoal = snapshot
    ? suggestedDailyProteinGrams(snapshot.profile)
    : 0;
  const proteinRem = snapshot
    ? Math.max(
        0,
        Math.round((proteinGoal - snapshot.todayMacros.proteinG) * 10) / 10,
      )
    : 0;
  const proteinMet = snapshot
    ? snapshot.todayMacros.proteinG >= proteinGoal
    : false;

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

              <View style={styles.card}>
                <Text style={styles.ringsSectionTitle}>Today</Text>
                <View style={styles.ringsRow}>
                  <ProgressRing
                    size={ringSize}
                    pct={calPct}
                    color={DASH_CAL}
                    label="Calories"
                    valueLine={`${snapshot.todayCalories}`}
                    subLine={`/ ${snapshot.calorieTarget}`}
                    alert={calOverEarly}
                  />
                  <ProgressRing
                    size={ringSize}
                    pct={waterPct}
                    color={DASH_WATER}
                    label="Water"
                    valueLine={`${Math.round(waterPct)}%`}
                    subLine={`${(snapshot.waterTodayMl / 1000).toFixed(1)} L`}
                  />
                  <ProgressRing
                    size={ringSize}
                    pct={exercisePct}
                    color={DASH_EXERCISE}
                    label="Exercise"
                    valueLine={`${exerciseToday}`}
                    subLine={`/ ${EXERCISE_RING_GOAL} min`}
                  />
                </View>
                {calOverEarly ? (
                  <Text style={styles.ringOverNote}>
                    +{calOverAmt} kcal over target
                  </Text>
                ) : null}
                <View style={styles.quickLinks}>
                  <Pressable
                    onPress={() => navigation.navigate('Meals')}
                    style={styles.quickLink}
                  >
                    <Text style={styles.quickLinkText}>Log meal</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => navigation.navigate('Water')}
                    style={styles.quickLink}
                  >
                    <Text style={styles.quickLinkText}>Add water</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.proteinHead}>
                  <Icon name="food-steak" size={22} color={DASH_SLATE} />
                  <Text style={styles.proteinTitle}>Protein</Text>
                </View>
                <Text style={styles.proteinLine}>
                  {snapshot.todayMacros.proteinG}g / {proteinGoal}g
                </Text>
                {proteinMet ? (
                  <Text style={styles.proteinDone}>Daily protein goal met</Text>
                ) : (
                  <Text style={styles.proteinRem}>
                    {proteinRem}g remaining to hit your goal
                  </Text>
                )}
                <View style={styles.proteinTrack}>
                  <View
                    style={[
                      styles.proteinFill,
                      {
                        width: `${Math.min(
                          100,
                          (snapshot.todayMacros.proteinG /
                            Math.max(proteinGoal, 1)) *
                            100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.row2}>
                <Pressable
                  onPress={() => setHrModal(true)}
                  style={({ pressed }) => [
                    styles.card,
                    styles.cardHalf,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={styles.cardIconRow}>
                    <View
                      style={[
                        styles.iconBubble,
                        { backgroundColor: DASH_HEART_SOFT },
                      ]}
                    >
                      <Icon name="heart-pulse" size={22} color={DASH_HEART} />
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
                  <View style={styles.sparkRow}>
                    <HeartSpark points={hrPoints} color={DASH_HEART} />
                  </View>
                </Pressable>

                <View style={[styles.card, styles.cardHalf]}>
                  <View style={styles.cardIconRow}>
                    <View
                      style={[
                        styles.iconBubble,
                        { backgroundColor: '#E0E7FF' },
                      ]}
                    >
                      <Icon name="scale-bathroom" size={22} color="#4F46E5" />
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
                  <View style={styles.weightPill}>
                    <Text style={styles.weightPillText}>{weightLabel}</Text>
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
    marginBottom: 12,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ringCol: {
    alignItems: 'center',
    position: 'relative',
  },
  ringCenter: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 13,
    fontWeight: '800',
    color: DASH_SLATE,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  ringValueAlert: {
    color: DASH_BAD,
  },
  ringLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '800',
    color: DASH_MUTED,
    textTransform: 'uppercase',
  },
  ringSub: {
    fontSize: 10,
    fontWeight: '600',
    color: DASH_MUTED,
    marginTop: 2,
  },
  ringOverNote: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: DASH_BAD,
  },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  quickLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: '800',
    color: MEAL_PRIMARY,
  },
  proteinHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  proteinTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DASH_SLATE,
  },
  proteinLine: {
    fontSize: 22,
    fontWeight: '800',
    color: DASH_SLATE,
  },
  proteinRem: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: DASH_MUTED,
  },
  proteinDone: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: DASH_OK,
  },
  proteinTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    marginTop: 12,
    overflow: 'hidden',
  },
  proteinFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: DASH_SLATE,
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
    fontSize: 36,
    fontWeight: '800',
    color: DASH_SLATE,
    letterSpacing: -1,
  },
  hrUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: DASH_MUTED,
    marginTop: 2,
  },
  hrEmpty: {
    fontSize: 18,
    fontWeight: '700',
    color: DASH_HEART,
    marginTop: 4,
  },
  sparkRow: {
    marginTop: 10,
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
  weightPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  weightPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
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
