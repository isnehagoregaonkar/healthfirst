import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {
  BmiInfo,
  MacroTargets,
} from '../../../services/mealCalorieTarget';
import type { DayMacroTotals } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import {
  MEAL_PRIMARY,
  MEAL_PRIMARY_DEEP,
  mealTypography,
} from '../mealUiTheme';

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
  macroTargets: MacroTargets | null;
  bmi: BmiInfo | null;
  dayLoading: boolean;
  onPressAdjustTargets: () => void;
}>;

type MacroKey = 'protein' | 'carbs' | 'fat' | 'fiber';

type MacroSpec = Readonly<{
  key: MacroKey;
  label: string;
  logged: number;
  target: number;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  trackColor: string;
}>;

const BMI_PALETTE: Record<
  BmiInfo['category'],
  { bg: string; fg: string; border: string }
> = {
  underweight: {
    bg: 'rgba(59,130,246,0.12)',
    fg: '#1D4ED8',
    border: 'rgba(59,130,246,0.3)',
  },
  normal: {
    bg: 'rgba(34,197,94,0.14)',
    fg: '#15803D',
    border: 'rgba(34,197,94,0.32)',
  },
  overweight: {
    bg: 'rgba(234,179,8,0.16)',
    fg: '#A16207',
    border: 'rgba(234,179,8,0.34)',
  },
  obese: {
    bg: 'rgba(239,68,68,0.14)',
    fg: '#B91C1C',
    border: 'rgba(239,68,68,0.32)',
  },
};

function BmiChip({ bmi }: Readonly<{ bmi: BmiInfo }>) {
  const palette = BMI_PALETTE[bmi.category];
  return (
    <View
      style={[
        styles.bmiChip,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <Icon name="human" size={14} color={palette.fg} />
      <Text style={[styles.bmiChipValue, { color: palette.fg }]}>
        BMI {bmi.bmi.toFixed(1)}
      </Text>
      <Text style={[styles.bmiChipLabel, { color: palette.fg }]}>
        {bmi.label}
      </Text>
    </View>
  );
}

function MacroProgressItem({ spec }: Readonly<{ spec: MacroSpec }>) {
  const hasTarget = spec.target > 0;
  const pctRaw = hasTarget ? (spec.logged / spec.target) * 100 : 0;
  const fillWidth = hasTarget ? Math.min(100, Math.max(0, pctRaw)) : 0;

  return (
    <View
      style={[
        styles.macroItem,
        { backgroundColor: spec.accentSoft, borderColor: spec.accentBorder },
      ]}
    >
      <Text style={[styles.macroItemLabel, { color: spec.accent }]}>
        {spec.label}
      </Text>
      <Text style={styles.macroItemValueStrong}>{fmtGrams(spec.logged)}</Text>
      {hasTarget ? (
        <Text style={styles.macroItemValueTarget}>/ {spec.target} g</Text>
      ) : (
        <Text style={styles.macroItemValueTarget}>g</Text>
      )}
      {hasTarget ? (
        <View
          style={[styles.macroItemTrack, { backgroundColor: spec.trackColor }]}
        >
          <View
            style={[
              styles.macroItemFill,
              { width: `${fillWidth}%`, backgroundColor: spec.accent },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

function MacroStrip({
  specs,
  targets,
}: Readonly<{ specs: readonly MacroSpec[]; targets: MacroTargets | null }>) {
  return (
    <View style={styles.macroStrip}>
      {/* <View style={styles.macroHeaderRow}>
        <Text style={styles.macroStripTitle}>Macro goals</Text>
        {targets ? (
          <Text style={styles.macroStripTargetTotal}>
            {targets.proteinG}P · {targets.carbsG}C · {targets.fatG}F g
          </Text>
        ) : null}
      </View> */}
      <View style={styles.macroList}>
        {specs.map(spec => (
          <MacroProgressItem key={spec.key} spec={spec} />
        ))}
      </View>
    </View>
  );
}

export function MealDaySummaryCard({
  dayLabel,
  totalCalories,
  macros,
  suggestedKcal,
  macroTargets,
  bmi,
  dayLoading,
  onPressAdjustTargets,
}: MealDaySummaryCardProps) {
  const pct =
    suggestedKcal > 0
      ? Math.min(100, Math.round((totalCalories / suggestedKcal) * 100))
      : 0;
  const over = totalCalories > suggestedKcal && suggestedKcal > 0;

  const macroSpecs: readonly MacroSpec[] = useMemo(
    () => [
      {
        key: 'protein',
        label: 'Protein',
        logged: macros.proteinG,
        target: macroTargets?.proteinG ?? 0,
        accent: '#2563EB',
        accentSoft: 'rgba(59, 130, 246, 0.08)',
        accentBorder: 'rgba(59, 130, 246, 0.22)',
        trackColor: 'rgba(59, 130, 246, 0.14)',
      },
      {
        key: 'carbs',
        label: 'Carbs',
        logged: macros.carbsG,
        target: macroTargets?.carbsG ?? 0,
        accent: '#CA8A04',
        accentSoft: 'rgba(234, 179, 8, 0.1)',
        accentBorder: 'rgba(234, 179, 8, 0.28)',
        trackColor: 'rgba(234, 179, 8, 0.16)',
      },
      {
        key: 'fat',
        label: 'Fat',
        logged: macros.fatG,
        target: macroTargets?.fatG ?? 0,
        accent: '#EA580C',
        accentSoft: 'rgba(249, 115, 22, 0.08)',
        accentBorder: 'rgba(249, 115, 22, 0.22)',
        trackColor: 'rgba(249, 115, 22, 0.14)',
      },
      {
        key: 'fiber',
        label: 'Fiber',
        logged: macros.fiberG,
        target: macroTargets?.fiberG ?? 0,
        accent: '#16A34A',
        accentSoft: 'rgba(34, 197, 94, 0.08)',
        accentBorder: 'rgba(34, 197, 94, 0.22)',
        trackColor: 'rgba(34, 197, 94, 0.16)',
      },
    ],
    [macros, macroTargets],
  );

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
          style={({ pressed }) => [
            styles.gearBtn,
            pressed && styles.gearBtnPressed,
          ]}
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
                <Text style={styles.statValue}>
                  {totalCalories.toLocaleString()}
                </Text>
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
            <View style={styles.barHintRow}>
              <Text style={[mealTypography.body, styles.barHint]}>
                {over
                  ? `${(
                      totalCalories - suggestedKcal
                    ).toLocaleString()} kcal over suggested`
                  : `${(
                      suggestedKcal - totalCalories
                    ).toLocaleString()} kcal remaining`}
              </Text>
              {bmi ? <BmiChip bmi={bmi} /> : null}
            </View>

            <MacroStrip specs={macroSpecs} targets={macroTargets} />
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
  bmiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  bmiChipValue: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  bmiChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.8,
  },
  macroStrip: {
    marginTop: 18,
  },
  macroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  macroStripTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  macroStripTargetTotal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  macroList: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  macroItem: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  macroItemLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  macroItemValueStrong: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
    lineHeight: 16,
  },
  macroItemValueTarget: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 12,
    marginTop: 1,
  },
  macroItemTrack: {
    alignSelf: 'stretch',
    marginTop: 6,
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  macroItemFill: {
    height: '100%',
    borderRadius: 999,
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
  barHintRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  barHint: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '600',
  },
});
