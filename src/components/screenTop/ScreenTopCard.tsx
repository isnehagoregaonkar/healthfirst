import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { StreakPanel, type StreakPanelProps } from '../../features/dashboard/components/StreakPanel';
import { isSameLocalDay, startOfLocalDay } from '../../features/water/waterDayUtils';
import type { DayStripScope } from './dayStripModel';
import { DEFAULT_PAST_LIMIT, isFutureLocalDay } from './dayStripModel';
import { useDayStripDays } from './useDayStripDays';

/** ~`StreakPanel` capsule `minWidth` (44) + strip `gap` (6); used to scroll selected day into view. */
const STRIP_CELL_W = 50;

export type { DayStripScope };

export type ScreenTopCardProps =
  | Readonly<{
      mode: 'streak';
      streak: StreakPanelProps;
    }>
  | Readonly<{
      mode: 'date';
      selectedDay: Date;
      onSelectDay: (d: Date) => void;
      stripScope: DayStripScope;
      pastDayLimit?: number;
      accentColor?: string;
    }>;

type DateStripProps = Readonly<{
  days: Date[];
  selectedDay: Date;
  onSelectDay: (d: Date) => void;
  accentColor: string;
}>;

function DateNumberStrip({ days, selectedDay, onSelectDay, accentColor }: DateStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const today = startOfLocalDay(new Date());

  useEffect(() => {
    const idx = days.findIndex(d => isSameLocalDay(d, selectedDay));
    if (idx >= 0 && scrollRef.current) {
      const x = Math.max(0, idx * STRIP_CELL_W - 48);
      scrollRef.current.scrollTo({ x, animated: true });
    }
  }, [days, selectedDay]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.dateStripRoot}
      contentContainerStyle={styles.stripScroll}
    >
      {days.map(d => {
        const label = d.toLocaleDateString(undefined, { weekday: 'short' });
        const selected = isSameLocalDay(d, selectedDay);
        const isToday = isSameLocalDay(d, today);
        const future = isFutureLocalDay(d);
        const dayNum = d.getDate();
        return (
          <Pressable
            key={d.getTime()}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: future }}
            disabled={future}
            onPress={() => onSelectDay(startOfLocalDay(d))}
            style={({ pressed }) => [
              styles.chip,
              selected && {
                borderWidth: 2,
                borderColor: accentColor,
                backgroundColor: `${accentColor}22`,
              },
              future && styles.chipFuture,
              pressed && !future && styles.chipPressed,
            ]}
          >
            <Text
              style={[
                styles.chipWeek,
                selected ? { color: accentColor } : undefined,
              ]}
            >
              {label}
            </Text>
            <Text style={[styles.chipDay, selected && { color: accentColor }]}>{dayNum}</Text>
            {isToday ? (
              <View
                style={[
                  styles.todayDot,
                  { backgroundColor: accentColor },
                  selected && styles.todayDotSelected,
                ]}
              />
            ) : (
              <View style={styles.todaySpacer} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type DateCardProps = Extract<ScreenTopCardProps, { mode: 'date' }>;

function ScreenTopCardDate(props: DateCardProps) {
  const accent = props.accentColor ?? colors.primary;
  const limit = props.pastDayLimit ?? DEFAULT_PAST_LIMIT;
  const days = useDayStripDays(props.stripScope, props.selectedDay, limit);

  return (
    <DateNumberStrip
      days={days}
      selectedDay={props.selectedDay}
      onSelectDay={props.onSelectDay}
      accentColor={accent}
    />
  );
}

export function ScreenTopCard(props: ScreenTopCardProps) {
  if (props.mode === 'streak') {
    return (
      <View style={styles.card}>
        <StreakPanel {...props.streak} />
      </View>
    );
  }
  return <ScreenTopCardDate {...props} />;
}

const styles = StyleSheet.create({
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
  dateStripRoot: {
    alignSelf: 'stretch',
  },
  stripScroll: {
    paddingRight: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  chip: {
    alignItems: 'center',
    minWidth: 44,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipFuture: {
    opacity: 0.5,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipWeek: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chipDay: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  todayDot: {
    marginTop: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.45,
  },
  todayDotSelected: {
    opacity: 1,
  },
  todaySpacer: {
    marginTop: 6,
    height: 5,
  },
});
