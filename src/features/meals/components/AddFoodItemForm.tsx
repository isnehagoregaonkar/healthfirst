import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MealWithItems } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY, MEAL_TYPE_ACCENTS, MEAL_TYPE_MCI, mealCard, mealTypography } from '../mealUiTheme';
import { MEAL_TYPE_LABEL } from '../mealConstants';
import { formatMealLogTime } from '../mealFormat';

type AddFoodItemFormProps = Readonly<{
  activeMeal: MealWithItems | null;
  submitting: boolean;
  onSubmit: (name: string, quantity: string, calories: string) => Promise<string | null>;
}>;

const PLACEHOLDER = '#9CA3AF';
const INPUT_BG = '#F3F4F6';

export function AddFoodItemForm({ activeMeal, submitting, onSubmit }: AddFoodItemFormProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [calories, setCalories] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    setFieldError(null);
    const err = await onSubmit(name, quantity, calories);
    if (err) {
      setFieldError(err);
      return;
    }
    setName('');
    setQuantity('');
    setCalories('');
  }, [name, quantity, calories, onSubmit]);

  if (!activeMeal) {
    return (
      <View style={[mealCard.wrap, styles.emptyCard]}>
        <View style={styles.emptyArt}>
          <Icon name="silverware-fork-knife" size={36} color={colors.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>Choose a meal</Text>
        <Text style={[mealTypography.body, styles.centerMuted]}>
          Tap a logged meal above, or start a new one with the colored tiles.
        </Text>
      </View>
    );
  }

  const label = MEAL_TYPE_LABEL[activeMeal.mealType];
  const time = formatMealLogTime(activeMeal.createdAt);
  const a = MEAL_TYPE_ACCENTS[activeMeal.mealType];
  const mci = MEAL_TYPE_MCI[activeMeal.mealType];

  return (
    <View style={[mealCard.wrap, styles.card]}>
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

      <Text style={styles.formTitle}>Add a food</Text>
      <Text style={[mealTypography.body, styles.formSub]}>Name, portion, and calories — quick to log.</Text>

      <Text style={[mealTypography.caption, styles.fieldLabel]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Greek yogurt & berries"
        placeholderTextColor={PLACEHOLDER}
        editable={!submitting}
        style={styles.input}
      />

      <Text style={[mealTypography.caption, styles.fieldLabel]}>Quantity</Text>
      <TextInput
        value={quantity}
        onChangeText={setQuantity}
        placeholder="e.g. 1 bowl, 2 eggs"
        placeholderTextColor={PLACEHOLDER}
        editable={!submitting}
        style={styles.input}
      />

      <Text style={[mealTypography.caption, styles.fieldLabel]}>Calories</Text>
      <TextInput
        value={calories}
        onChangeText={setCalories}
        placeholder="e.g. 320"
        placeholderTextColor={PLACEHOLDER}
        keyboardType="number-pad"
        editable={!submitting}
        style={styles.input}
      />

      {fieldError ? (
        <View style={styles.errorRow}>
          <Icon name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.fieldError}>{fieldError}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add food item"
        disabled={submitting}
        onPress={() => handleAdd().catch(() => {})}
        style={({ pressed }) => [
          styles.submitBtn,
          submitting && styles.submitDisabled,
          pressed && !submitting && styles.submitPressed,
        ]}
      >
        <Icon name="plus-circle-outline" size={22} color={colors.surface} />
        <Text style={styles.submitText}>{submitting ? 'Adding…' : 'Add to this meal'}</Text>
      </Pressable>
    </View>
  );
}

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
    marginBottom: 18,
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
    marginBottom: 8,
    fontSize: 14,
  },
  fieldLabel: {
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: INPUT_BG,
    fontWeight: '500',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  fieldError: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    lineHeight: 20,
  },
  submitBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: MEAL_PRIMARY,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: MEAL_PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitDisabled: {
    opacity: 0.55,
  },
  submitPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  submitText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: -0.2,
  },
});
