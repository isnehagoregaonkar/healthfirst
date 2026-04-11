import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/tokens';
import { exerciseTheme as t } from '../exerciseTheme';
import { addCalendarDays, isSameLocalDay, startOfLocalDay } from '../utils/exerciseDayUtils';

const VISIBLE_PAST_DAYS = 45;

type ExerciseDayStripProps = Readonly<{
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
}>;

function buildDays(): Date[] {
  const today = startOfLocalDay(new Date());
  const out: Date[] = [];
  for (let i = VISIBLE_PAST_DAYS; i >= 0; i -= 1) {
    out.push(addCalendarDays(today, -i));
  }
  return out;
}

export function ExerciseDayStrip({ selectedDay, onSelectDay }: ExerciseDayStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const stripDays = useMemo(() => {
    const base = buildDays();
    if (base.some(d => isSameLocalDay(d, selectedDay))) {
      return base;
    }
    const merged = [...base, startOfLocalDay(selectedDay)].sort(
      (a, b) => a.getTime() - b.getTime(),
    );
    return merged;
  }, [selectedDay]);

  useEffect(() => {
    const idx = stripDays.findIndex(d => isSameLocalDay(d, selectedDay));
    if (idx >= 0 && scrollRef.current) {
      const x = Math.max(0, idx * 72 - 48);
      scrollRef.current.scrollTo({ x, animated: true });
    }
  }, [selectedDay, stripDays]);

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripContent}
      >
        {stripDays.map(d => {
          const selected = isSameLocalDay(d, selectedDay);
          const today = isSameLocalDay(d, new Date());
          const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
          const dayNum = d.getDate();
          return (
            <Pressable
              key={d.getTime()}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${weekday} ${dayNum}`}
              onPress={() => onSelectDay(d)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipWeek, selected && styles.chipWeekSelected]}>
                {weekday}
              </Text>
              <Text style={[styles.chipDay, selected && styles.chipDaySelected]}>
                {dayNum}
              </Text>
              {today ? (
                <View style={[styles.todayDot, selected && styles.todayDotSelected]} />
              ) : (
                <View style={styles.todaySpacer} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  stripContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  chip: {
    width: 64,
    marginRight: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: t.accentSoft,
    borderColor: t.accent,
    borderWidth: 2,
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
  chipWeekSelected: {
    color: t.accent,
  },
  chipDay: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  chipDaySelected: {
    color: t.accent,
  },
  todayDot: {
    marginTop: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: t.stepsTint,
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
