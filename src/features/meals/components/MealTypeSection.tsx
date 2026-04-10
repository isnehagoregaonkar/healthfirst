import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MealType, MealWithItems } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_TYPE_ACCENTS, MEAL_TYPE_MCI, mealCard, mealTypography } from '../mealUiTheme';
import { MEAL_TYPE_LABEL } from '../mealConstants';
import { MealEntryCard } from './MealEntryCard';

type MealTypeSectionProps = Readonly<{
  mealType: MealType;
  meals: MealWithItems[];
  highlightedMealId: string | null;
  onSelectMeal: (mealId: string) => void;
}>;

export function MealTypeSection({
  mealType,
  meals,
  highlightedMealId,
  onSelectMeal,
}: MealTypeSectionProps) {
  const a = MEAL_TYPE_ACCENTS[mealType];
  const icon = MEAL_TYPE_MCI[mealType];

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: `${a.primary}22` }]}>
          <Icon name={icon} size={20} color={a.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.sectionHeading}>{MEAL_TYPE_LABEL[mealType]}</Text>
          <Text style={[mealTypography.body, styles.headerMeta]}>
            {meals.length === 0 ? 'Nothing here yet' : `${meals.length} logged`}
          </Text>
        </View>
        <View style={[styles.countDot, { borderColor: a.border }]}>
          <Text style={[styles.countNum, { color: a.deep }]}>{meals.length}</Text>
        </View>
      </View>

      {meals.length === 0 ? (
        <View style={[mealCard.dashed, styles.emptyCard, { borderColor: a.border }]}>
          <Icon name="silverware-fork-knife" size={22} color={colors.textSecondary} style={styles.emptyIcon} />
          <Text style={[mealTypography.body, styles.emptyCenter]}>
            No {MEAL_TYPE_LABEL[mealType].toLowerCase()} yet — tap a meal button above.
          </Text>
        </View>
      ) : (
        meals.map((m) => (
          <MealEntryCard
            key={m.id}
            meal={m}
            selected={highlightedMealId === m.id}
            onSelect={() => onSelectMeal(m.id)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerMeta: {
    marginTop: -2,
    fontSize: 14,
  },
  countDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyCard: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    alignSelf: 'center',
    marginBottom: 8,
    opacity: 0.55,
  },
  emptyCenter: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
