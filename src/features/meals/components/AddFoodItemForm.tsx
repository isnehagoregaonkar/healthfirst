import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { LogMealItemPayload, MealWithItems } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY, MEAL_TYPE_ACCENTS, MEAL_TYPE_MCI, mealCard, mealTypography } from '../mealUiTheme';
import { MEAL_TYPE_LABEL } from '../mealConstants';
import { formatMealLogTime } from '../mealFormat';
import { FoodSearchPanel } from './FoodSearchPanel';

type AddFoodItemFormProps = Readonly<{
  activeMeal: MealWithItems | null;
  submitting: boolean;
  onSubmit: (item: LogMealItemPayload) => Promise<string | null>;
  variant?: 'standalone' | 'modal';
}>;

export function AddFoodItemForm({
  activeMeal,
  submitting,
  onSubmit,
  variant = 'standalone',
}: AddFoodItemFormProps) {
  const inModal = variant === 'modal';

  if (!activeMeal) {
    return (
      <View style={[mealCard.wrap, styles.emptyCard]}>
        <View style={styles.emptyArt}>
          <Icon name="silverware-fork-knife" size={36} color={colors.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>Choose a meal</Text>
        <Text style={[mealTypography.body, styles.centerMuted]}>
          Tap a logged meal card above, or start a new one with the meal buttons.
        </Text>
      </View>
    );
  }

  const label = MEAL_TYPE_LABEL[activeMeal.mealType];
  const time = formatMealLogTime(activeMeal.createdAt);
  const a = MEAL_TYPE_ACCENTS[activeMeal.mealType];
  const mci = MEAL_TYPE_MCI[activeMeal.mealType];

  return (
    <View style={[inModal ? styles.cardModal : mealCard.wrap, !inModal && styles.card, inModal && styles.cardModalPad]}>
      <View style={styles.cardHeader}>
        <View style={[styles.mealChip, { backgroundColor: a.soft, borderColor: a.border }]}>
          <Icon name={mci} size={18} color={a.primary} />
          <Text style={[styles.mealChipText, { color: a.deep }]}>{label}</Text>
        </View>
        {time ? (
          <View style={styles.timeChip}>
            <Icon name="clock-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.timeChipText}>{time}</Text>
          </View>
        ) : null}
      </View>

      {inModal ? null : (
        <>
          <Text style={styles.formTitle}>Add food</Text>
          <Text style={[mealTypography.body, styles.formSub]}>Search, pick a portion, then add — values shown are for your serving.</Text>
        </>
      )}

      <FoodSearchPanel submitting={submitting} onSubmitPayload={onSubmit} />
    </View>
  );
}

const INPUT_BG = '#F3F4F6';

const styles = StyleSheet.create({
  emptyCard: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyArt: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: INPUT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  centerMuted: {
    textAlign: 'center',
    paddingHorizontal: 8,
    lineHeight: 22,
  },
  cardModal: {
    backgroundColor: 'transparent',
  },
  cardModalPad: {
    paddingVertical: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  card: {
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: `${MEAL_PRIMARY}35`,
  },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  mealChipText: {
    fontSize: 14,
    fontWeight: '800',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: INPUT_BG,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  formSub: {
    marginBottom: 12,
    fontSize: 14,
  },
});
