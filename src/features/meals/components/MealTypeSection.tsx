import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MealItemRow, MealType, MealWithItems } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_TYPE_ACCENTS, MEAL_TYPE_MCI, mealTypography } from '../mealUiTheme';
import { MEAL_TYPE_LABEL } from '../mealConstants';
import { MealEmptyMealSlotCard, MealLoggedItemCard } from './MealLoggedItemCard';

type MealTypeSectionProps = Readonly<{
  mealType: MealType;
  meals: MealWithItems[];
  highlightedMealId: string | null;
  deletingItemId: string | null;
  deletingMealId: string | null;
  onSelectMeal: (mealId: string) => void;
  onRemoveItem: (item: MealItemRow, mealId: string) => void;
  onRemoveEmptyMeal: (mealId: string) => void;
}>;

export function MealTypeSection({
  mealType,
  meals,
  highlightedMealId,
  deletingItemId,
  deletingMealId,
  onSelectMeal,
  onRemoveItem,
  onRemoveEmptyMeal,
}: MealTypeSectionProps) {
  const a = MEAL_TYPE_ACCENTS[mealType];
  const icon = MEAL_TYPE_MCI[mealType];

  const sectionSubtitle = useMemo(() => {
    const n = meals.reduce((acc, m) => acc + m.items.length, 0);
    if (n === 0) {
      return 'Nothing logged yet';
    }
    if (n === 1) {
      return '1 food';
    }
    return `${n} foods`;
  }, [meals]);

  const sectionCalories = useMemo(
    () => meals.reduce((sum, m) => sum + m.subtotalCalories, 0),
    [meals],
  );

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: `${a.primary}22` }]}>
            <Icon name={icon} size={20} color={a.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.sectionHeading}>{MEAL_TYPE_LABEL[mealType]}</Text>
            <Text style={[mealTypography.body, styles.headerMeta]}>{sectionSubtitle}</Text>
          </View>
        </View>
        <View
          style={[
            styles.sectionCalPill,
            sectionCalories > 0
              ? { backgroundColor: a.soft, borderColor: a.border }
              : styles.sectionCalPillMuted,
          ]}
        >
          <Text
            style={[
              styles.sectionCalText,
              sectionCalories > 0 ? { color: a.deep } : styles.sectionCalTextMuted,
            ]}
          >
            {sectionCalories} kcal
          </Text>
        </View>
      </View>

      {meals.length === 0 ? (
        <View style={[styles.emptyHintCard, { borderColor: a.border }]}>
          <Icon name="silverware-fork-knife" size={22} color={colors.textSecondary} style={styles.emptyIcon} />
          <Text style={[mealTypography.body, styles.emptyCenter]}>
            No {MEAL_TYPE_LABEL[mealType].toLowerCase()} yet — tap a meal button above.
          </Text>
        </View>
      ) : (
        meals.flatMap((m) =>
          m.items.length === 0
            ? [
                <MealEmptyMealSlotCard
                  key={m.id}
                  meal={m}
                  selected={highlightedMealId === m.id}
                  deleting={deletingMealId === m.id}
                  onPressCard={() => onSelectMeal(m.id)}
                  onPressRemove={() => onRemoveEmptyMeal(m.id)}
                />,
              ]
            : m.items.map((it) => (
                <MealLoggedItemCard
                  key={it.id}
                  meal={m}
                  item={it}
                  selected={highlightedMealId === m.id}
                  deleting={deletingItemId === it.id}
                  onPressCard={() => onSelectMeal(m.id)}
                  onPressRemove={() => onRemoveItem(it, m.id)}
                />
              )),
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
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
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sectionCalPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  sectionCalPillMuted: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  sectionCalText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionCalTextMuted: {
    color: colors.textSecondary,
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
    flexShrink: 1,
  },
  headerMeta: {
    marginTop: -2,
    fontSize: 14,
  },
  emptyHintCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
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
