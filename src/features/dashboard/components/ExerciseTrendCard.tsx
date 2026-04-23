import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/tokens';
import { DASH_MUTED, DASH_SLATE, EXERCISE_BAR, EXERCISE_BAR_TODAY } from '../dashboardTokens';

type ExerciseTrendCardProps = Readonly<{
  exerciseToday: number;
  moveEstKcalToday: number;
  weekTotalMin: number;
  weekEstKcal: number;
  values: ReadonlyArray<number>;
  labels: ReadonlyArray<string>;
  dayKeys: ReadonlyArray<string>;
  goalMinutes: number;
  todayIndex: number;
  onPress?: () => void;
}>;

type ExerciseWeekBarsProps = Readonly<{
  values: ReadonlyArray<number>;
  labels: ReadonlyArray<string>;
  dayKeys: ReadonlyArray<string>;
  goalMinutes: number;
  todayIndex: number;
  maxBarHeight?: number;
}>;

function ExerciseZigzagBg() {
  return (
    <Svg width={112} height={96} style={styles.exerciseZigzagSvg} pointerEvents="none">
      <Path
        d="M -4 72 Q 22 28 48 64 T 108 52 L 116 96 L -8 96 Z"
        fill="#FFEDD5"
        opacity={0.45}
      />
    </Svg>
  );
}

function ExerciseWeekBars({
  values,
  labels,
  dayKeys,
  goalMinutes,
  todayIndex,
  maxBarHeight = 62,
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
                    backgroundColor: isToday ? EXERCISE_BAR_TODAY : EXERCISE_BAR,
                  },
                ]}
              >
                <View style={styles.exerciseBarDot} />
              </View>
            </View>
            <Text style={[styles.exerciseBarLbl, isToday && styles.exerciseBarLblToday]}>
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function ExerciseTrendCard({
  exerciseToday,
  moveEstKcalToday,
  weekTotalMin,
  weekEstKcal,
  values,
  labels,
  dayKeys,
  goalMinutes,
  todayIndex,
  onPress,
}: ExerciseTrendCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardIconRow}>
        <View style={styles.exerciseIconBubble}>
          <Icon name="run-fast" size={20} color={EXERCISE_BAR_TODAY} />
        </View>
        <Text style={styles.cardEyebrow}>Move</Text>
      </View>
      <View style={styles.exerciseBody}>
        <View style={styles.exerciseCopy}>
          <Text style={styles.todayHeroMetric}>{exerciseToday} min today</Text>
          <Text style={styles.todayHeroSub}>
            {goalMinutes} min goal · est. {moveEstKcalToday} kcal
          </Text>
          <Text style={styles.todayHeroMicro}>
            Week {weekTotalMin} min · ~{weekEstKcal} kcal
          </Text>
        </View>
        <View style={styles.exerciseChart}>
          <ExerciseZigzagBg />
          <ExerciseWeekBars
            values={values}
            labels={labels}
            dayKeys={dayKeys}
            goalMinutes={goalMinutes}
            todayIndex={todayIndex}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
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
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: DASH_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
  },
  exerciseCopy: {
    flex: 1,
    minWidth: 0,
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
  exerciseChart: {
    width: 132,
    minHeight: 86,
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
});
