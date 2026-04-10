import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MealItemRow, MealWithItems } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY, MEAL_TYPE_ACCENTS, mealTypography } from '../mealUiTheme';
import { formatMealLogTime } from '../mealFormat';

function fmtM(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.05) {
    return String(Math.round(n));
  }
  return n.toFixed(1);
}

/** Second line: full macro names, very small type. */
function macroDetailLine(item: MealItemRow): string | null {
  const has =
    item.proteinG != null || item.carbsG != null || item.fatG != null || item.fiberG != null;
  if (!has) {
    return null;
  }
  const p = item.proteinG ?? 0;
  const c = item.carbsG ?? 0;
  const f = item.fatG ?? 0;
  const fi = item.fiberG ?? 0;
  const parts = [
    `Protein ${fmtM(p)} g`,
    `Carbs ${fmtM(c)} g`,
    `Fat ${fmtM(f)} g`,
  ];
  if (fi > 0.05) {
    parts.push(`Fiber ${fmtM(fi)} g`);
  }
  return parts.join(' · ');
}

type MealLoggedItemCardProps = Readonly<{
  meal: MealWithItems;
  item: MealItemRow;
  selected: boolean;
  deleting: boolean;
  onPressCard: () => void;
  onPressRemove: () => void;
}>;

export function MealLoggedItemCard({
  meal,
  item,
  selected,
  deleting,
  onPressCard,
  onPressRemove,
}: MealLoggedItemCardProps) {
  const accent = MEAL_TYPE_ACCENTS[meal.mealType];
  const time = formatMealLogTime(meal.createdAt);
  const macroLine = macroDetailLine(item);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPressCard}
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
      <View style={styles.topRow}>
        <View style={styles.timeRow}>
          <Icon name="clock-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.timeText}>{time || 'Meal'}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name}`}
          disabled={deleting}
          onPress={onPressRemove}
          style={({ pressed: p }) => [
            styles.trashBtn,
            deleting && styles.trashDisabled,
            p && !deleting && styles.trashPressed,
          ]}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Icon name="trash-can-outline" size={20} color={colors.error} />
          )}
        </Pressable>
      </View>

      <Text style={styles.itemName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.itemMeta} numberOfLines={2}>
        {item.quantity ? `${item.quantity} · ` : ''}
        {item.calories} cal
      </Text>
      {macroLine ? <Text style={styles.macroDetail}>{macroLine}</Text> : null}

      {selected ? (
        <View style={styles.selectedHint}>
          <Icon name="check-circle" size={14} color={MEAL_PRIMARY} />
          <Text style={styles.selectedHintText}>Adding more to this meal</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

type MealEmptyMealSlotCardProps = Readonly<{
  meal: MealWithItems;
  selected: boolean;
  deleting: boolean;
  onPressCard: () => void;
  onPressRemove: () => void;
}>;

export function MealEmptyMealSlotCard({
  meal,
  selected,
  deleting,
  onPressCard,
  onPressRemove,
}: MealEmptyMealSlotCardProps) {
  const accent = MEAL_TYPE_ACCENTS[meal.mealType];
  const time = formatMealLogTime(meal.createdAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPressCard}
      style={({ pressed }) => [
        styles.emptyCard,
        { borderColor: accent.border, borderLeftWidth: 4, borderLeftColor: accent.primary },
        selected && styles.emptySelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.timeRow}>
          <Icon name="clock-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.timeText}>{time || 'Meal'}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove empty meal slot"
          disabled={deleting}
          onPress={onPressRemove}
          style={({ pressed: p }) => [
            styles.trashBtn,
            deleting && styles.trashDisabled,
            p && !deleting && styles.trashPressed,
          ]}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Icon name="trash-can-outline" size={20} color={colors.error} />
          )}
        </Pressable>
      </View>
      <View style={styles.emptyBody}>
        <Icon name="food-outline" size={18} color={colors.textSecondary} />
        <Text style={[mealTypography.body, styles.emptyHint]}>Tap to add food.</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  trashBtn: {
    padding: 4,
    borderRadius: 10,
  },
  trashDisabled: {
    opacity: 0.55,
  },
  trashPressed: {
    backgroundColor: colors.background,
    opacity: 0.92,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
    lineHeight: 20,
  },
  itemMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 19,
  },
  macroDetail: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 14,
    opacity: 0.92,
  },
  selectedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  selectedHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: MEAL_PRIMARY,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptySelected: {
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: MEAL_PRIMARY,
  },
  emptyBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 0,
  },
  emptyHint: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
