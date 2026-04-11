import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React, { useCallback, useState } from 'react';
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
import Svg, { Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen } from '../../components/layout/Screen';
import { colors } from '../../theme/tokens';
import type { MainTabParamList } from '../../navigation/types';
import { useDrawerUserProfile } from '../../navigation/hooks/useDrawerUserProfile';
import { addHeartRateReading } from '../../services/vitals';
import { MEAL_PRIMARY } from '../meals/mealUiTheme';
import { useDashboardData } from './hooks/useDashboardData';

const DASH_SLATE = '#0F172A';
const DASH_MUTED = '#64748B';
const DASH_HEART = '#E11D48';
const DASH_HEART_SOFT = '#FFE4E9';
const DASH_WATER = '#0284C7';
const DASH_CAL = '#D97706';
const EXERCISE_DUMMY = [18, 32, 45, 28, 52, 36, 22];

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

function formatShortWeekday(d: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
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
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type WeeklyBarsProps = Readonly<{
  values: number[];
  maxHint: number;
  color: string;
  formatTick: (n: number) => string;
  labels: string[];
}>;

function WeeklyBars({ values, maxHint, color, formatTick, labels }: WeeklyBarsProps) {
  const { width: winW } = useWindowDimensions();
  const chartW = Math.min(winW - 72, 340);
  const h = 112;
  const pad = 8;
  const barGap = 6;
  const n = values.length;
  const barW = n > 0 ? (chartW - pad * 2 - barGap * (n - 1)) / n : 0;
  if (n === 0) {
    return null;
  }
  const maxV = Math.max(maxHint, ...values, 1);
  return (
    <View style={styles.chartWrap}>
      <Svg width={chartW} height={h}>
        <Defs>
          <LinearGradient id="barFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.95} />
            <Stop offset="1" stopColor={color} stopOpacity={0.35} />
          </LinearGradient>
        </Defs>
        {values.map((v, i) => {
          const bh = maxV > 0 ? (v / maxV) * (h - 36) : 0;
          const x = pad + i * (barW + barGap);
          const y = h - 24 - bh;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(bh, 2)}
              rx={5}
              fill="url(#barFade)"
            />
          );
        })}
      </Svg>
      <View style={[styles.barLabels, { width: chartW }]}>
        {labels.map((lb, i) => (
          <Text key={i} style={[styles.barLabel, { maxWidth: barW + barGap }]}>
            {lb}
          </Text>
        ))}
      </View>
      <Text style={styles.chartCaption}>Peak {formatTick(maxV)}</Text>
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
  const nums = points.map((p) => (p == null ? null : p));
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
      <Line x1={0} y1={h - 1} x2={w} y2={h - 1} stroke={colors.border} strokeWidth={1} />
      {d ? <Path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /> : null}
    </Svg>
  );
}

type LogHeartRateModalProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  onLogged: () => void;
}>;

function LogHeartRateModal({ visible, onClose, onLogged }: LogHeartRateModalProps) {
  const [bpm, setBpm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setErr(null);
    const n = Number.parseInt(bpm.replace(/\s/g, ''), 10);
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
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalScrim} onPress={onClose} accessibilityLabel="Dismiss" />
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
            style={[styles.modalPrimary, busy && styles.modalPrimaryDisabled]}
          >
            <Text style={styles.modalPrimaryText}>{busy ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
          </View>
        </View>
      </View>
    </Modal>
  );
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

  const calPct = snapshot
    ? Math.min(100, Math.round((snapshot.todayCalories / Math.max(snapshot.calorieTarget, 1)) * 100))
    : 0;

  const waterPct = snapshot
    ? Math.min(100, Math.round((snapshot.waterTodayMl / Math.max(snapshot.waterGoalMl, 1)) * 100))
    : 0;

  const weightDelta =
    snapshot != null ? snapshot.profile.weightKg - snapshot.profile.goalWeightKg : 0;
  const weightLabel =
    snapshot == null
      ? ''
      : Math.abs(weightDelta) < 0.15
        ? 'On target'
        : weightDelta > 0
          ? `${weightDelta.toFixed(1)} kg to goal`
          : `${Math.abs(weightDelta).toFixed(1)} kg above goal`;

  const mealLabels = snapshot?.mealWeek.map((d) => formatShortWeekday(d.date)) ?? [];
  const mealVals = snapshot?.mealWeek.map((d) => d.totalCalories) ?? [];
  const waterLabels = snapshot?.waterWeek.map((d) => formatShortWeekday(d.date)) ?? [];
  const waterVals = snapshot?.waterWeek.map((d) => d.totalMl) ?? [];
  const hrPoints = snapshot?.heartWeek.map((d) => d.avgBpm) ?? [];

  return (
    <Screen applyBottomSafeArea={false} backgroundColor="#F8FAFC">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && !!snapshot} onRefresh={() => void refresh()} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.hero, { width: winW }]}>
          <Svg style={StyleSheet.absoluteFill} width={winW} height={120} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="heroWash" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#D1FAE5" stopOpacity={0.9} />
                <Stop offset="1" stopColor="#F8FAFC" stopOpacity={0.2} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={winW} height={120} fill="url(#heroWash)" />
          </Svg>
          <View style={styles.heroInner}>
            <Text style={styles.heroKicker}>{greetingForNow()}</Text>
            <Text style={styles.heroName}>{user?.name ?? 'there'}</Text>
            <Text style={styles.heroSub}>Your health snapshot · pull to refresh</Text>
          </View>
        </View>

        <View style={styles.body}>
          {loading && !snapshot ? (
            <View style={styles.centerLoad}>
              <ActivityIndicator size="large" color={MEAL_PRIMARY} />
              <Text style={styles.loadLabel}>Loading your dashboard…</Text>
            </View>
          ) : null}

          {error && !snapshot ? (
            <View style={styles.errorCard}>
              <Icon name="alert-circle-outline" size={22} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => void refresh()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {snapshot ? (
            <>
              <View style={styles.row2}>
                <Pressable
                  onPress={() => setHrModal(true)}
                  style={({ pressed }) => [styles.card, styles.cardHalf, pressed && styles.cardPressed]}
                >
                  <View style={styles.cardIconRow}>
                    <View style={[styles.iconBubble, { backgroundColor: DASH_HEART_SOFT }]}>
                      <Icon name="heart-pulse" size={22} color={DASH_HEART} />
                    </View>
                    <Text style={styles.cardEyebrow}>Heart rate</Text>
                  </View>
                  {snapshot.heartLatest ? (
                    <>
                      <Text style={styles.hrBig}>{snapshot.heartLatest.bpm}</Text>
                      <Text style={styles.hrUnit}>BPM · {formatRelativeHeartTime(snapshot.heartLatest.recordedAt)}</Text>
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
                    <View style={[styles.iconBubble, { backgroundColor: '#E0E7FF' }]}>
                      <Icon name="scale-bathroom" size={22} color="#4F46E5" />
                    </View>
                    <Text style={styles.cardEyebrow}>Weight</Text>
                  </View>
                  <Text style={styles.weightBig}>
                    {snapshot.profile.weightKg.toFixed(1)}
                    <Text style={styles.weightUnit}> kg</Text>
                  </Text>
                  <Text style={styles.weightGoal}>Goal {snapshot.profile.goalWeightKg.toFixed(1)} kg</Text>
                  <View style={styles.weightPill}>
                    <Text style={styles.weightPillText}>{weightLabel}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHead}>
                  <Icon name="fire" size={22} color={DASH_CAL} />
                  <Text style={styles.sectionTitle}>Today&apos;s fuel</Text>
                </View>
                <View style={styles.calRow}>
                  <View>
                    <Text style={styles.calBig}>{snapshot.todayCalories}</Text>
                    <Text style={styles.calOf}>of {snapshot.calorieTarget} kcal</Text>
                  </View>
                  <Text style={styles.calPct}>{calPct}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${calPct}%`, backgroundColor: MEAL_PRIMARY }]} />
                </View>
                <View style={styles.macroRow}>
                  <View style={styles.macroChip}>
                    <Text style={styles.macroVal}>{snapshot.todayMacros.proteinG}g</Text>
                    <Text style={styles.macroLbl}>Protein</Text>
                  </View>
                  <View style={styles.macroChip}>
                    <Text style={styles.macroVal}>{snapshot.todayMacros.carbsG}g</Text>
                    <Text style={styles.macroLbl}>Carbs</Text>
                  </View>
                  <View style={styles.macroChip}>
                    <Text style={styles.macroVal}>{snapshot.todayMacros.fatG}g</Text>
                    <Text style={styles.macroLbl}>Fat</Text>
                  </View>
                  <View style={styles.macroChip}>
                    <Text style={styles.macroVal}>{snapshot.todayMacros.fiberG}g</Text>
                    <Text style={styles.macroLbl}>Fiber</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => navigation.navigate('Meals')}
                  style={({ pressed }) => [styles.linkRow, pressed && styles.cardPressed]}
                >
                  <Text style={styles.linkText}>Log a meal</Text>
                  <Icon name="chevron-right" size={20} color={MEAL_PRIMARY} />
                </Pressable>
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHead}>
                  <Icon name="cup-water" size={22} color={DASH_WATER} />
                  <Text style={styles.sectionTitle}>Hydration</Text>
                </View>
                <Text style={styles.waterLine}>
                  {(snapshot.waterTodayMl / 1000).toFixed(1)} L / {(snapshot.waterGoalMl / 1000).toFixed(1)} L
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${waterPct}%`, backgroundColor: DASH_WATER }]} />
                </View>
                <Pressable
                  onPress={() => navigation.navigate('Water')}
                  style={({ pressed }) => [styles.linkRow, pressed && styles.cardPressed]}
                >
                  <Text style={styles.linkText}>Add water</Text>
                  <Icon name="chevron-right" size={20} color={DASH_WATER} />
                </Pressable>
              </View>

              <Text style={styles.trendsTitle}>This week</Text>

              <View style={styles.card}>
                <Text style={styles.chartTitle}>Calories</Text>
                <WeeklyBars
                  values={mealVals}
                  maxHint={snapshot.calorieTarget}
                  color={DASH_CAL}
                  formatTick={(n) => `${Math.round(n)} kcal`}
                  labels={mealLabels}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.chartTitle}>Water</Text>
                <WeeklyBars
                  values={waterVals}
                  maxHint={snapshot.waterGoalMl}
                  color={DASH_WATER}
                  formatTick={(n) => `${(n / 1000).toFixed(1)} L`}
                  labels={waterLabels}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.chartTitle}>Heart rate (daily avg)</Text>
                {hrPoints.some((x) => x != null) ? (
                  <WeeklyBars
                    values={hrPoints.map((x) => x ?? 0)}
                    maxHint={100}
                    color={DASH_HEART}
                    formatTick={(n) => `${Math.round(n)} bpm`}
                    labels={mealLabels}
                  />
                ) : (
                  <Text style={styles.emptyChart}>Log readings to see your trend.</Text>
                )}
              </View>

              <View style={[styles.card, styles.exerciseCard]}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseBadge}>
                    <Text style={styles.exerciseBadgeText}>Soon</Text>
                  </View>
                  <Icon name="run-fast" size={26} color={DASH_SLATE} />
                  <Text style={styles.exerciseTitle}>Exercise</Text>
                  <Text style={styles.exerciseSub}>Workouts & steps will sync here. Preview with sample data:</Text>
                </View>
                <WeeklyBars
                  values={EXERCISE_DUMMY}
                  maxHint={60}
                  color="#8B5CF6"
                  formatTick={(n) => `${n} min`}
                  labels={mealLabels.length ? mealLabels : ['M', 'T', 'W', 'T', 'F', 'S', 'S']}
                />
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <LogHeartRateModal visible={hrModal} onClose={() => setHrModal(false)} onLogged={onHrLogged} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  hero: {
    minHeight: 120,
    marginBottom: 8,
  },
  heroInner: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 20,
    zIndex: 2,
  },
  heroKicker: {
    fontSize: 14,
    fontWeight: '600',
    color: DASH_MUTED,
    letterSpacing: 0.3,
  },
  heroName: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    color: DASH_SLATE,
    letterSpacing: -0.5,
  },
  heroSub: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: DASH_MUTED,
  },
  body: {
    paddingHorizontal: 18,
    gap: 14,
  },
  centerLoad: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
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
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardHalf: {
    flex: 1,
    minWidth: 0,
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DASH_SLATE,
  },
  calRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  calBig: {
    fontSize: 36,
    fontWeight: '800',
    color: DASH_SLATE,
  },
  calOf: {
    fontSize: 13,
    fontWeight: '600',
    color: DASH_MUTED,
    marginTop: 2,
  },
  calPct: {
    fontSize: 22,
    fontWeight: '800',
    color: MEAL_PRIMARY,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  macroChip: {
    flexGrow: 1,
    minWidth: '22%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  macroVal: {
    fontSize: 15,
    fontWeight: '800',
    color: DASH_SLATE,
  },
  macroLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: DASH_MUTED,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
    color: MEAL_PRIMARY,
  },
  waterLine: {
    fontSize: 20,
    fontWeight: '800',
    color: DASH_SLATE,
  },
  trendsTitle: {
    marginTop: 8,
    marginBottom: -4,
    fontSize: 13,
    fontWeight: '800',
    color: DASH_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DASH_SLATE,
    marginBottom: 8,
  },
  chartWrap: {
    alignItems: 'center',
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 0,
  },
  barLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: DASH_MUTED,
    textAlign: 'center',
  },
  chartCaption: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: DASH_MUTED,
  },
  emptyChart: {
    fontSize: 14,
    color: DASH_MUTED,
    fontWeight: '600',
    paddingVertical: 16,
    textAlign: 'center',
  },
  exerciseCard: {
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  exerciseHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseBadge: {
    alignSelf: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EDE9FE',
  },
  exerciseBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 0.5,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DASH_SLATE,
    marginTop: 4,
  },
  exerciseSub: {
    fontSize: 13,
    color: DASH_MUTED,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: 8,
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
