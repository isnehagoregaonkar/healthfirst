import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { DayMacroTotals } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY, MEAL_PRIMARY_DEEP, mealTypography } from '../mealUiTheme';

function fmtGrams(n: number): string {
  if (n < 0.05) {
    return '0';
  }
  if (Math.abs(n - Math.round(n)) < 0.05) {
    return String(Math.round(n));
  }
  return n.toFixed(1);
}

type MealDaySummaryCardProps = Readonly<{
  dayLabel: string;
  totalCalories: number;
  macros: DayMacroTotals;
  suggestedKcal: number;
  dayLoading: boolean;
  onPressAdjustTargets: () => void;
}>;

export function MealDaySummaryCard({
  dayLabel,
  totalCalories,
  macros,
  suggestedKcal,
  dayLoading,
  onPressAdjustTargets,
}: MealDaySummaryCardProps) {
  const pct =
    suggestedKcal > 0 ? Math.min(100, Math.round((totalCalories / suggestedKcal) * 100)) : 0;
  const over = totalCalories > suggestedKcal && suggestedKcal > 0;

  const showMacroStrip = useMemo(() => {
    const sum = macros.proteinG + macros.carbsG + macros.fatG + macros.fiberG;
    return sum > 0.02;
  }, [macros]);

  return (
    <View style={styles.outer}>
      <View style={styles.heroBand}>
        <View style={styles.heroIconWrap}>
          <Icon name="fire" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.heroTitles}>
          <Text style={styles.heroEyebrow}>{dayLabel}</Text>
          <Text style={styles.heroTitle}>Calories</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adjust calorie target"
          onPress={onPressAdjustTargets}
          style={({ pressed }) => [styles.gearBtn, pressed && styles.gearBtnPressed]}
        >
          <Icon name="tune-variant" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.body}>
        {dayLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={MEAL_PRIMARY} />
            <Text style={styles.loadingText}>Updating day…</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text style={styles.statCaption}>Logged</Text>
                <Text style={styles.statValue}>{totalCalories.toLocaleString()}</Text>
                <Text style={styles.statUnit}>kcal</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statCaption}>Suggested</Text>
                <Text style={[styles.statValue, styles.statValueMuted]}>
                  {suggestedKcal.toLocaleString()}
                </Text>
                <Text style={styles.statUnit}>kcal / day</Text>
              </View>
            </View>

            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${pct}%` },
                  over && styles.barFillOver,
                  !over && pct >= 85 && pct < 100 && styles.barFillWarn,
                ]}
              />
            </View>
            <Text style={[mealTypography.body, styles.barHint]}>
              {over
                ? `${(totalCalories - suggestedKcal).toLocaleString()} kcal over suggested`
                : `${(suggestedKcal - totalCalories).toLocaleString()} kcal remaining`}
            </Text>

            {showMacroStrip ? (
              <View style={styles.macroStrip}>
                <Text style={styles.macroStripTitle}>Today's macros</Text>
                <View style={styles.macroRow}>
                  <View style={[styles.macroTile, styles.macroTileProtein]}>
                    <Text style={styles.macroTileLabel}>Protein</Text>
                    <Text style={styles.macroTileValue}>{fmtGrams(macros.proteinG)} g</Text>
                  </View>
                  <View style={[styles.macroTile, styles.macroTileCarbs]}>
                    <Text style={styles.macroTileLabel}>Carbs</Text>
                    <Text style={styles.macroTileValue}>{fmtGrams(macros.carbsG)} g</Text>
                  </View>
                  <View style={[styles.macroTile, styles.macroTileFat]}>
                    <Text style={styles.macroTileLabel}>Fat</Text>
                    <Text style={styles.macroTileValue}>{fmtGrams(macros.fatG)} g</Text>
                  </View>
                  <View style={[styles.macroTile, styles.macroTileFiber]}>
                    <Text style={styles.macroTileLabel}>Fiber</Text>
                    <Text style={styles.macroTileValue}>{fmtGrams(macros.fiberG)} g</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginTop: 12,
    marginBottom: 18,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: MEAL_PRIMARY_DEEP,
    gap: 12,
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
  gearBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  gearBtnPressed: {
    opacity: 0.85,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statBlock: {
    flex: 1,
    minWidth: 0,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  statCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.8,
  },
  statValueMuted: {
    color: MEAL_PRIMARY,
  },
  statUnit: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  macroStrip: {
    marginTop: 16,
  },
  macroStripTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  macroTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  macroTileProtein: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.22)',
  },
  macroTileCarbs: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.28)',
  },
  macroTileFat: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.22)',
  },
  macroTileFiber: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.22)',
  },
  macroTileLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
    textAlign: 'center',
  },
  macroTileValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  barTrack: {
    marginTop: 16,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: MEAL_PRIMARY,
  },
  barFillWarn: {
    backgroundColor: '#CA8A04',
  },
  barFillOver: {
    backgroundColor: colors.error,
  },
  barHint: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
});
