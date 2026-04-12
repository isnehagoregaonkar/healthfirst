import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { ScreenTopCard } from '../../components/screenTop';
import { colors } from '../../theme/tokens';
import { formatDayShort, startOfLocalDay } from '../water/waterDayUtils';

export function StepsTrackingScreen() {
  const [selectedDay, setSelectedDay] = useState(() => startOfLocalDay(new Date()));

  const selectDay = useCallback((d: Date) => {
    setSelectedDay(startOfLocalDay(d));
  }, []);

  const dayLabel = formatDayShort(selectedDay);

  return (
    <Screen applyTopSafeArea={false} applyBottomSafeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTopCard
          mode="date"
          selectedDay={selectedDay}
          onSelectDay={selectDay}
          stripScope="scrollablePast"
        />

        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Steps</Text>
          <Text style={styles.placeholderBody}>
            Step totals for {dayLabel} will appear here when this screen is connected to Health
            Connect / HealthKit.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 28,
  },
  placeholderCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  placeholderBody: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
