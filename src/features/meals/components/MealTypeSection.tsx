import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {
  MealItemRow,
  MealType,
  MealWithItems,
} from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_TYPE_ACCENTS, MEAL_TYPE_MCI, mealTypography } from '../mealUiTheme';
import { MEAL_TYPE_LABEL } from '../mealConstants';
import { MealLoggedItemCard } from './MealLoggedItemCard';

function itemSelectionFooter(
  rowSelected: boolean,
  highlightedItemId: string | null,
  itemId: string,
): 'add' | 'edit' | 'none' {
  if (!rowSelected) {
    return 'none';
  }
  if (highlightedItemId === itemId) {
    return 'edit';
  }
  return 'add';
}

type MealTypeSectionProps = Readonly<{
  mealType: MealType;
  meals: MealWithItems[];
  highlightedMealId: string | null;
  /** When set, sheet is editing this food line; when null with highlightedMealId, sheet is add-food mode. */
  highlightedItemId: string | null;
  deletingItemId: string | null;
  onOpenMealSheet: (mealId: string, itemId: string | null) => void;
  onRemoveItem: (item: MealItemRow, mealId: string) => void;
  /** Opens add-food for this meal type (reuses an empty meal if one exists). */
  onRequestAddMealForType: (mealType: MealType) => void | Promise<void>;
  addingMealType: MealType | null;
}>;

export function MealTypeSection({
  mealType,
  meals,
  highlightedMealId,
  highlightedItemId,
  deletingItemId,
  onOpenMealSheet,
  onRemoveItem,
  onRequestAddMealForType,
  addingMealType,
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

      {meals.every(m => m.items.length === 0) ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${MEAL_TYPE_LABEL[mealType]}`}
          accessibilityHint="Opens food search for this meal type"
          disabled={addingMealType === mealType}
          onPress={() => {
            Promise.resolve(onRequestAddMealForType(mealType)).catch(() => {});
          }}
          style={({ pressed }) => [
            styles.emptyHintCard,
            { borderColor: a.border },
            pressed &&
              addingMealType !== mealType &&
              styles.emptyHintPressed,
          ]}
        >
          <Icon name="silverware-fork-knife" size={22} color={colors.textSecondary} style={styles.emptyIcon} />
          {addingMealType === mealType ? (
            <ActivityIndicator style={styles.emptySpinner} color={a.primary} />
          ) : null}
          <Text style={[mealTypography.body, styles.emptyCenter]}>
            No {MEAL_TYPE_LABEL[mealType].toLowerCase()} yet — tap here or a meal button above.
          </Text>
        </Pressable>
      ) : (
        meals.flatMap((m) =>
          m.items.map((it) => {
            const rowSelected =
              highlightedMealId === m.id &&
              (highlightedItemId === null || highlightedItemId === it.id);
            return (
              <MealLoggedItemCard
                key={it.id}
                meal={m}
                item={it}
                selected={rowSelected}
                selectionFooter={itemSelectionFooter(rowSelected, highlightedItemId, it.id)}
                deleting={deletingItemId === it.id}
                onPressCard={() => onOpenMealSheet(m.id, it.id)}
                onPressRemove={() => onRemoveItem(it, m.id)}
              />
            );
          }),
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
  emptyHintPressed: {
    opacity: 0.92,
    backgroundColor: colors.background,
  },
  emptySpinner: {
    marginBottom: 8,
  },
});
