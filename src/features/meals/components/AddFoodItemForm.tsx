import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { LogMealItemPayload, MealWithItems } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY, MEAL_TYPE_ACCENTS, MEAL_TYPE_MCI, mealCard, mealTypography } from '../mealUiTheme';
import { MEAL_TYPE_LABEL } from '../mealConstants';
import { formatMealLogTime } from '../mealFormat';
import { UsdaFoodSearchSection } from './UsdaFoodSearchSection';

type AddFoodItemFormProps = Readonly<{
  activeMeal: MealWithItems | null;
  submitting: boolean;
  onSubmit: (item: LogMealItemPayload) => Promise<string | null>;
  variant?: 'standalone' | 'modal';
}>;

const PLACEHOLDER = '#9CA3AF';
const INPUT_BG = '#F3F4F6';

type EntryMode = 'usda' | 'manual';

export function AddFoodItemForm({
  activeMeal,
  submitting,
  onSubmit,
  variant = 'standalone',
}: AddFoodItemFormProps) {
  const inModal = variant === 'modal';
  const [mode, setMode] = useState<EntryMode>('usda');

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [calories, setCalories] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleManualAdd = useCallback(async () => {
    setFieldError(null);
    const cal = Number.parseInt(calories.replaceAll(/\s/g, ''), 10);
    if (Number.isNaN(cal)) {
      setFieldError('Enter calories as a whole number.');
      return;
    }
    const err = await onSubmit({
      name: name.trim(),
      quantity: quantity.trim(),
      calories: cal,
      usdaFdcId: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      fiberG: null,
    });
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
          <Text style={styles.formTitle}>Add a food</Text>
          <Text style={[mealTypography.body, styles.formSub]}>USDA search or manual entry.</Text>
        </>
      )}

      <View style={styles.modeRow}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'usda' }}
          onPress={() => {
            setMode('usda');
            setFieldError(null);
          }}
          style={({ pressed }) => [
            styles.modeTab,
            mode === 'usda' && styles.modeTabOn,
            pressed && styles.modeTabPressed,
          ]}
        >
          <Icon name="food-apple-outline" size={18} color={mode === 'usda' ? MEAL_PRIMARY : colors.textSecondary} />
          <Text style={[styles.modeTabText, mode === 'usda' && styles.modeTabTextOn]}>USDA</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'manual' }}
          onPress={() => {
            setMode('manual');
            setFieldError(null);
          }}
          style={({ pressed }) => [
            styles.modeTab,
            mode === 'manual' && styles.modeTabOn,
            pressed && styles.modeTabPressed,
          ]}
        >
          <Icon name="pencil-outline" size={18} color={mode === 'manual' ? MEAL_PRIMARY : colors.textSecondary} />
          <Text style={[styles.modeTabText, mode === 'manual' && styles.modeTabTextOn]}>Manual</Text>
        </Pressable>
      </View>

      {mode === 'usda' ? (
        <UsdaFoodSearchSection submitting={submitting} onSubmitPayload={onSubmit} />
      ) : (
        <>
          <Text style={[mealTypography.caption, styles.fieldLabel]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Homemade soup"
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add food item"
            disabled={submitting}
            onPress={() => handleManualAdd().catch(() => {})}
            style={({ pressed }) => [
              styles.submitBtn,
              submitting && styles.submitDisabled,
              pressed && !submitting && styles.submitPressed,
            ]}
          >
            <Icon name="plus-circle-outline" size={22} color={colors.surface} />
            <Text style={styles.submitText}>{submitting ? 'Adding…' : 'Add to this meal'}</Text>
          </Pressable>
        </>
      )}

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
    marginBottom: 8,
    fontSize: 14,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeTabOn: {
    borderColor: MEAL_PRIMARY,
    backgroundColor: colors.primarySoft,
  },
  modeTabPressed: {
    opacity: 0.9,
  },
  modeTabText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  modeTabTextOn: {
    color: MEAL_PRIMARY,
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
