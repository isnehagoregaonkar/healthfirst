import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY, MEAL_PRIMARY_DEEP, mealTypography } from '../mealUiTheme';

type MealDaySummaryCardProps = Readonly<{
  totalCalories: number;
}>;

export function MealDaySummaryCard({ totalCalories }: MealDaySummaryCardProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.heroBand}>
        <View style={styles.heroIconWrap}>
          <Icon name="fire" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.heroTitles}>
          <Text style={styles.heroEyebrow}>Today</Text>
          <Text style={styles.heroTitle}>Nutrition snapshot</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.statRow}>
          <Text style={styles.bigNumber}>{totalCalories.toLocaleString()}</Text>
          <View style={styles.kcalPill}>
            <Text style={styles.kcalPillText}>kcal</Text>
          </View>
        </View>
        <Text style={[mealTypography.body, styles.sub]}>Total calories logged so far</Text>
        <View style={styles.sparkRow}>
          <Icon name="chart-bell-curve" size={16} color={colors.textSecondary} />
          <Text style={styles.sparkHint}>Keep logging meals for better insights</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 22,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.18)',
    shadowColor: MEAL_PRIMARY_DEEP,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  heroBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: MEAL_PRIMARY_DEEP,
    gap: 14,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitles: {
    flex: 1,
    minWidth: 0,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  bigNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  kcalPill: {
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.35)',
  },
  kcalPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: MEAL_PRIMARY,
    letterSpacing: 0.3,
  },
  sub: {
    marginTop: 6,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sparkHint: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
