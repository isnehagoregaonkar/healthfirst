import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { LogMealItemPayload, MealItemRow } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY, mealTypography } from '../mealUiTheme';
import { rememberFoodAfterLog } from '../mealRecentFoodsStorage';

type EditMealItemFormProps = Readonly<{
  item: MealItemRow;
  submitting: boolean;
  onSave: (payload: LogMealItemPayload) => Promise<string | null>;
  onAddAnotherFood: () => void;
}>;

const PLACEHOLDER = '#9CA3AF';
const INPUT_BG = '#F3F4F6';

export function EditMealItemForm({
  item,
  submitting,
  onSave,
  onAddAnotherFood,
}: EditMealItemFormProps) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [calories, setCalories] = useState(String(item.calories));
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setName(item.name);
    setQuantity(item.quantity);
    setCalories(String(item.calories));
    setFieldError(null);
  }, [item.id, item.name, item.quantity, item.calories]);

  const handleSave = useCallback(async () => {
    setFieldError(null);
    const cal = Number.parseInt(calories.replaceAll(/\s/g, ''), 10);
    if (Number.isNaN(cal)) {
      setFieldError('Enter calories as a whole number.');
      return;
    }
    const payload: LogMealItemPayload = {
      name: name.trim(),
      quantity: quantity.trim(),
      calories: cal,
      usdaFdcId: item.usdaFdcId,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      fiberG: item.fiberG,
    };
    const err = await onSave(payload);
    if (err) {
      setFieldError(err);
      return;
    }
    rememberFoodAfterLog(payload).catch(() => {});
  }, [calories, item, name, onSave, quantity]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>
        Update name, portion, or calories. Macros stay as logged unless you replace this food via search.
      </Text>

      <Text style={[mealTypography.caption, styles.label]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Food name"
        placeholderTextColor={PLACEHOLDER}
        editable={!submitting}
        style={styles.input}
      />

      <Text style={[mealTypography.caption, styles.label]}>Quantity</Text>
      <TextInput
        value={quantity}
        onChangeText={setQuantity}
        placeholder="e.g. 1 cup, 2 eggs"
        placeholderTextColor={PLACEHOLDER}
        editable={!submitting}
        style={styles.input}
      />

      <Text style={[mealTypography.caption, styles.label]}>Calories</Text>
      <TextInput
        value={calories}
        onChangeText={setCalories}
        placeholder="kcal"
        placeholderTextColor={PLACEHOLDER}
        keyboardType="number-pad"
        editable={!submitting}
        style={styles.input}
      />

      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={() => handleSave().catch(() => {})}
        style={({ pressed }) => [
          styles.saveBtn,
          submitting && styles.saveBtnDisabled,
          pressed && !submitting && styles.saveBtnPressed,
        ]}
      >
        <Icon name="content-save-outline" size={20} color={colors.surface} />
        <Text style={styles.saveBtnText}>{submitting ? 'Saving…' : 'Save changes'}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens food search to add another item to this meal"
        disabled={submitting}
        onPress={onAddAnotherFood}
        style={({ pressed }) => [styles.secondaryBtn, submitting && styles.secondaryDisabled, pressed && !submitting && styles.secondaryPressed]}
      >
        <Text style={styles.secondaryBtnText}>Add another food instead</Text>
      </Pressable>

      {fieldError ? (
        <View style={styles.errorRow}>
          <Icon name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.fieldError}>{fieldError}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
  },
  lead: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  label: {
    marginTop: 12,
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
  saveBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: MEAL_PRIMARY,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnPressed: {
    opacity: 0.92,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
  secondaryBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryDisabled: {
    opacity: 0.45,
  },
  secondaryPressed: {
    opacity: 0.85,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: MEAL_PRIMARY,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
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
});
