import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/** Per-day streak strip: logged + calories vs target, or empty / future. */
export type StreakCapsuleTone = 'future' | 'missed' | 'good' | 'warn' | 'over';

export type StreakCapsuleModel = Readonly<{
  id: string;
  label: string;
  isToday: boolean;
  tone: StreakCapsuleTone;
}>;

const SLATE = '#0F172A';
const MUTED = '#64748B';
const GREEN = '#22C55E';
const GREEN_DEEP = '#15803D';
const RED = '#DC2626';
const RED_DEEP = '#B91C1C';
const TRACK = '#E2E8F0';
/** Goal met: classic streak flame (warm, not green check). */
const STREAK_FLAME = '#EA580C';
const STREAK_FLAME_SOFT = '#FFF7ED';

type StreakDayCapsuleProps = Readonly<{
  label: string;
  isToday: boolean;
  tone: StreakCapsuleTone;
}>;

function circleBg(tone: StreakCapsuleTone): string {
  switch (tone) {
    case 'good':
      return STREAK_FLAME_SOFT;
    case 'warn':
      return '#FEF3C7';
    case 'over':
      return '#FEE2E2';
    case 'future':
    case 'missed':
    default:
      return '#F1F5F9';
  }
}

function CapsuleIcon({ tone }: Readonly<{ tone: StreakCapsuleTone }>) {
  switch (tone) {
    case 'good':
      return <Icon name="fire" size={18} color={STREAK_FLAME} />;
    case 'warn':
      return <Icon name="food-apple" size={17} color="#B45309" />;
    case 'over':
      return <Icon name="fire" size={18} color={RED} />;
    case 'missed':
    case 'future':
      return <Icon name="fire-off" size={16} color="#94A3B8" />;
  }
}

function StreakDayCapsule({ label, isToday, tone }: StreakDayCapsuleProps) {
  return (
    <View style={[capsuleStyles.wrap, isToday && capsuleStyles.wrapToday]}>
      <Text
        style={[capsuleStyles.dayLbl, isToday && capsuleStyles.dayLblToday]}
      >
        {label}
      </Text>
      <View style={[capsuleStyles.circle, { backgroundColor: circleBg(tone) }]}>
        <CapsuleIcon tone={tone} />
      </View>
    </View>
  );
}

type StreakRingProps = Readonly<{
  size: number;
  pct: number;
  streakDays: number;
  /** Today over calorie target → red ring + flame. */
  todayOver?: boolean;
}>;

function StreakRing({ size, pct, streakDays, todayOver }: StreakRingProps) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const dash = (clamped / 100) * circ;
  const arcColor = todayOver ? RED : GREEN;
  const flameColor = todayOver ? RED_DEEP : GREEN_DEEP;
  return (
    <View style={ringStyles.wrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={TRACK}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={arcColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <View style={[ringStyles.center, { width: size, height: size }]}>
        <Text style={ringStyles.num}>{streakDays}</Text>
        <Text style={ringStyles.days}>Days</Text>
        <Icon
          name="fire"
          size={14}
          color={flameColor}
          style={ringStyles.flame}
        />
      </View>
    </View>
  );
}

export type StreakPanelProps = Readonly<{
  days: ReadonlyArray<StreakCapsuleModel>;
  currentStreak: number;
  longestStreak: number;
  todayOver?: boolean;
}>;

export function StreakPanel({
  days,
  currentStreak,
  longestStreak,
  todayOver,
}: StreakPanelProps) {
  const { width: winW } = useWindowDimensions();
  /** Body padding 18×2 + streak card padding 14×2 */
  const cardW = Math.max(260, winW - 64);

  const ringPct = Math.min(100, Math.round((currentStreak / 7) * 100));
  const ringDisplayPct = currentStreak === 0 ? 6 : Math.max(12, ringPct);

  const title =
    currentStreak > 0 ? "You've been keeping track" : 'Start your streak';
  const heroHeight = 128;
  const ringSize = 88;

  return (
    <View style={styles.block}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripScroll}
      >
        {days.map(d => (
          <StreakDayCapsule
            key={d.id}
            label={d.label}
            isToday={d.isToday}
            tone={d.tone}
          />
        ))}
      </ScrollView>

      <View style={[styles.heroCard, { width: cardW, height: heroHeight }]}>
        <Svg width={cardW} height={heroHeight}>
          <Defs>
            <LinearGradient id="streakHeroGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#DCFCE7" />
              <Stop offset="0.55" stopColor="#ECFDF5" />
              <Stop offset="1" stopColor="#F8FAFC" />
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={cardW}
            height={heroHeight}
            rx={22}
            ry={22}
            fill="url(#streakHeroGrad)"
          />
        </Svg>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.heroRow}>
            <StreakRing
              size={ringSize}
              pct={ringDisplayPct}
              streakDays={currentStreak}
              todayOver={todayOver}
            />
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{title}</Text>
              {longestStreak > 0 ? (
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    Longest streak {longestStreak} days
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const capsuleStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    minWidth: 44,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginRight: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8EEF4',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  dayLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapToday: {
    borderColor: '#86EFAC',
    borderWidth: 1.5,
  },
  dayLblToday: {
    color: GREEN_DEEP,
    fontWeight: '800',
  },
  circleToday: {
    borderWidth: 2,
    borderColor: '#4ADE80',
  },
});

const ringStyles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  center: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 6,
  },
  num: {
    fontSize: 26,
    fontWeight: '800',
    color: SLATE,
    lineHeight: 30,
  },
  days: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    marginTop: -2,
  },
  flame: {
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  block: {
    gap: 14,
  },
  stripScroll: {
    paddingRight: 4,
    paddingVertical: 2,
    alignItems: 'flex-start',
  },
  heroCard: {
    borderRadius: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  heroRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    gap: 14,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SLATE,
    letterSpacing: -0.2,
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '500',
    color: MUTED,
    lineHeight: 18,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
});
