import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MealWithItems } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY, MEAL_TYPE_ACCENTS, mealTypography } from '../mealUiTheme';
import { formatMealLogTime } from '../mealFormat';

type MealEntryCardProps = Readonly<{
  meal: MealWithItems;
  selected: boolean;
  onSelect: () => void;
}>;

export function MealEntryCard({ meal, selected, onSelect }: MealEntryCardProps) {
  const time = formatMealLogTime(meal.createdAt);
  const accent = MEAL_TYPE_ACCENTS[meal.mealType];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.cardBase,
        { borderLeftWidth: 4, borderLeftColor: accent.primary },
        selected ? styles.cardSelected : styles.cardIdle,
        selected && {
          borderTopWidth: 2,
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderTopColor: MEAL_PRIMARY,
          borderRightColor: MEAL_PRIMARY,
          borderBottomColor: MEAL_PRIMARY,
        },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.timeBlock}>
          <Icon name="clock-outline" size={16} color={colors.textSecondary} />
          <Text style={mealTypography.labelBold}>{time || 'Meal'}</Text>
        </View>
        <View style={[styles.calPill, { backgroundColor: accent.soft, borderColor: accent.border }]}>
          <Text style={[styles.calories, { color: accent.deep }]}>{meal.subtotalCalories} cal</Text>
        </View>
      </View>
      {meal.items.length === 0 ? (
        <View style={styles.emptyRow}>
          <Icon name="food-outline" size={18} color={colors.textSecondary} />
          <Text style={[mealTypography.body, styles.emptyHint]}>No foods yet — select this meal and add below.</Text>
        </View>
      ) : (
        meal.items.map((it, index) => (
          <View key={it.id} style={[styles.itemRow, index > 0 && styles.itemDivider]}>
            <View style={styles.itemDot} />
            <View style={styles.itemBody}>
              <Text style={styles.itemName}>{it.name}</Text>
              <Text style={styles.itemMeta}>
                {it.quantity ? `${it.quantity} · ` : ''}
                {it.calories} cal
                {it.usdaFdcId != null &&
                (it.proteinG != null || it.carbsG != null || it.fatG != null || it.fiberG != null)
                  ? ` · P ${(it.proteinG ?? 0).toFixed(1)} / C ${(it.carbsG ?? 0).toFixed(1)} / F ${(it.fatG ?? 0).toFixed(1)}${
                      it.fiberG != null && it.fiberG > 0 ? ` · Fi ${it.fiberG.toFixed(1)}` : ''
                    } g`
                  : ''}
              </Text>
            </View>
          </View>
        ))
      )}
      {selected ? (
        <View style={styles.selectedHint}>
          <Icon name="check-circle" size={16} color={MEAL_PRIMARY} />
          <Text style={styles.selectedHintText}>Active — adding food here</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  cardIdle: {
    borderTopColor: colors.border,
    borderRightColor: colors.border,
    borderBottomColor: colors.border,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  cardSelected: {
    shadowColor: MEAL_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  cardPressed: {
    opacity: 0.94,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  calPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  calories: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 4,
  },
  emptyHint: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  itemDivider: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
    marginRight: 10,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  selectedHintText: {
    fontSize: 13,
    fontWeight: '700',
    color: MEAL_PRIMARY,
  },
});
