import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchUsdaFoodDetail, sanitizeLoggedQuantityLabel } from '../../../services/usdaFdc';
import type { LogMealItemPayload, MealItemRow } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY, mealTypography } from '../mealUiTheme';
import { rememberFoodAfterLog } from '../mealRecentFoodsStorage';
import { findFoodValueEntryByName, formatFoodValueDisplayName } from '../foodValuesCatalog';
import {
  computeScaledFromDetail,
  mealDetailPer100g,
  mealDetailPortionOptions,
  type MealFoodDetailState,
} from '../mealFoodDetailState';
import { inferPortionSelectionFromItem } from '../mealPortionInference';
import { FoodPortionMacrosBlock } from './FoodPortionMacrosBlock';

type EditMealItemFormProps = Readonly<{
  item: MealItemRow;
  submitting: boolean;
  onSave: (payload: LogMealItemPayload) => Promise<string | null>;
  onAddAnotherFood: () => void;
}>;

const PLACEHOLDER = '#9CA3AF';
const INPUT_BG = '#F3F4F6';

type EditorMode = 'loading' | 'portion' | 'manual';

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

  const [mode, setMode] = useState<EditorMode>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MealFoodDetailState | null>(null);
  const [portionIndex, setPortionIndex] = useState(0);
  const [servingsText, setServingsText] = useState('1');

  useEffect(() => {
    setName(item.name);
    setQuantity(item.quantity);
    setCalories(String(item.calories));
    setFieldError(null);
  }, [item.id, item.name, item.quantity, item.calories]);

  useEffect(() => {
    let cancelled = false;
    setMode('loading');
    setLoadError(null);
    setDetail(null);

    async function run() {
      if (item.usdaFdcId != null && Number.isFinite(item.usdaFdcId)) {
        const r = await fetchUsdaFoodDetail(Math.round(item.usdaFdcId));
        if (cancelled) {
          return;
        }
        if (!r.ok) {
          setLoadError(r.error);
          setMode('manual');
          return;
        }
        const { portionIndex: pi, servingsText: st } = inferPortionSelectionFromItem(
          item,
          r.food.per100g,
          r.food.portionOptions,
        );
        setDetail({ kind: 'usda', food: r.food });
        setPortionIndex(pi);
        setServingsText(st);
        setMode('portion');
        return;
      }

      const localEntry = findFoodValueEntryByName(item.name);
      if (localEntry) {
        if (cancelled) {
          return;
        }
        const per100g = mealDetailPer100g({ kind: 'local', entry: localEntry });
        const opts = mealDetailPortionOptions({ kind: 'local', entry: localEntry });
        const { portionIndex: pi, servingsText: st } = inferPortionSelectionFromItem(
          item,
          per100g,
          opts,
        );
        setDetail({ kind: 'local', entry: localEntry });
        setPortionIndex(pi);
        setServingsText(st);
        setMode('portion');
        return;
      }

      if (!cancelled) {
        setMode('manual');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [item]);

  const scaled = useMemo(
    () => (detail ? computeScaledFromDetail(detail, portionIndex, servingsText) : null),
    [detail, portionIndex, servingsText],
  );

  const portionTitle =
    detail?.kind === 'usda'
      ? detail.food.description
      : detail?.kind === 'local'
        ? formatFoodValueDisplayName(detail.entry)
        : '';

  const portionSubtitle =
    detail?.kind === 'usda' && detail.food.brandOwner
      ? detail.food.brandOwner
      : detail?.kind === 'local'
        ? `${detail.entry.category} · from food-values guide`
        : null;

  const handleSavePortion = useCallback(async () => {
    if (!detail || !scaled) {
      return;
    }
    setFieldError(null);
    const qtyRaw =
      scaled.servings === 1
        ? scaled.portionLabel
        : `${scaled.servings} × ${scaled.portionLabel}`;
    const qty = sanitizeLoggedQuantityLabel(qtyRaw);
    const payload: LogMealItemPayload = {
      name: name.trim(),
      quantity: qty,
      calories: Math.round(scaled.kcal),
      usdaFdcId: detail.kind === 'usda' ? detail.food.fdcId : null,
      proteinG: scaled.protein,
      carbsG: scaled.carbs,
      fatG: scaled.fat,
      fiberG: scaled.fiber > 0 ? scaled.fiber : null,
    };
    const err = await onSave(payload);
    if (err) {
      setFieldError(err);
      return;
    }
    rememberFoodAfterLog(payload).catch(() => {});
  }, [detail, scaled, name, onSave]);

  const handleSaveManual = useCallback(async () => {
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
      {mode === 'loading' ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={MEAL_PRIMARY} />
          <Text style={styles.loadingText}>Loading portions…</Text>
        </View>
      ) : null}

      {mode === 'manual' && loadError ? (
        <Text style={styles.warnInline}>{loadError} — edit manually below.</Text>
      ) : null}

      <Text style={styles.lead}>
        {mode === 'portion'
          ? 'Adjust portion and servings — calories and macros update from the catalog.'
          : 'Update name, portion text, and calories. Items without a linked catalog entry use the simple fields only.'}
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

      {mode === 'portion' && detail && scaled ? (
        <FoodPortionMacrosBlock
          title={portionTitle}
          subtitle={portionSubtitle}
          portionOptions={mealDetailPortionOptions(detail)}
          portionIndex={portionIndex}
          onPortionIndex={setPortionIndex}
          servingsText={servingsText}
          onServingsText={setServingsText}
          scaled={scaled}
          submitting={submitting}
          primaryLabel={submitting ? 'Updating…' : 'Update Meal'}
          primaryIcon="silverware-fork-knife"
          onPrimary={() => handleSavePortion().catch(() => {})}
        />
      ) : null}

      {mode === 'manual' ? (
        <>
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
            onPress={() => handleSaveManual().catch(() => {})}
            style={({ pressed }) => [
              styles.saveBtn,
              submitting && styles.saveBtnDisabled,
              pressed && !submitting && styles.saveBtnPressed,
            ]}
          >
            <Icon name="silverware-fork-knife" size={20} color={colors.surface} />
            <Text style={styles.saveBtnText}>{submitting ? 'Updating…' : 'Update Meal'}</Text>
          </Pressable>
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens food search to add another item to this meal"
        disabled={submitting}
        onPress={onAddAnotherFood}
        style={({ pressed }) => [
          styles.secondaryBtn,
          submitting && styles.secondaryDisabled,
          pressed && !submitting && styles.secondaryPressed,
        ]}
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  warnInline: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 19,
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
