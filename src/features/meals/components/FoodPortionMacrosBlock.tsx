import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY } from '../mealUiTheme';
import type { ScaledMealNutrition } from '../mealFoodDetailState';
import type { UsdaPortionOption } from '../../../services/usdaFdc';

const INPUT_BG = '#F3F4F6';

type FoodPortionMacrosBlockProps = Readonly<{
  title: string;
  subtitle?: string | null;
  portionOptions: UsdaPortionOption[];
  portionIndex: number;
  onPortionIndex: (index: number) => void;
  servingsText: string;
  onServingsText: (text: string) => void;
  scaled: ScaledMealNutrition | null;
  submitting: boolean;
  primaryLabel: string;
  primaryIcon?: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}>;

export function FoodPortionMacrosBlock({
  title,
  subtitle,
  portionOptions,
  portionIndex,
  onPortionIndex,
  servingsText,
  onServingsText,
  scaled,
  submitting,
  primaryLabel,
  primaryIcon = 'plus',
  onPrimary,
  secondaryLabel,
  onSecondary,
}: FoodPortionMacrosBlockProps) {
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailTitle} numberOfLines={3}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.detailBrand}>{subtitle}</Text> : null}

      <Text style={styles.subLabel}>Portion</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.portionStrip}
      >
        {portionOptions.map((opt, i) => (
          <Pressable
            key={`${opt.label}-${opt.grams}-${i}`}
            accessibilityRole="button"
            accessibilityState={{ selected: portionIndex === i }}
            onPress={() => onPortionIndex(i)}
            style={({ pressed }) => [
              styles.portionChip,
              portionIndex === i && styles.portionChipOn,
              pressed && styles.portionChipPressed,
            ]}
          >
            <Text
              style={[styles.portionChipText, portionIndex === i && styles.portionChipTextOn]}
              numberOfLines={2}
            >
              {opt.label}
            </Text>
            <Text style={styles.portionGrams}>{opt.grams} g</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.subLabel}>Servings of this portion</Text>
      <View style={styles.servingRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decrease servings"
          onPress={() => {
            const v = Math.max(0.25, (Number.parseFloat(servingsText) || 1) - 0.25);
            onServingsText(String(v));
          }}
          style={styles.stepBtn}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <TextInput
          value={servingsText}
          onChangeText={onServingsText}
          keyboardType="decimal-pad"
          style={styles.servingInput}
          editable={!submitting}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Increase servings"
          onPress={() => {
            const v = (Number.parseFloat(servingsText) || 1) + 0.25;
            onServingsText(String(v));
          }}
          style={styles.stepBtn}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>

      {scaled ? (
        <>
          <View style={styles.macroGrid}>
            <View style={styles.macroCell}>
              <Text style={styles.macroVal}>{Math.round(scaled.kcal)}</Text>
              <Text style={styles.macroLbl}>kcal</Text>
            </View>
            <View style={styles.macroCell}>
              <Text style={styles.macroVal}>{scaled.protein.toFixed(1)}</Text>
              <Text style={styles.macroLbl}>protein g</Text>
            </View>
            <View style={styles.macroCell}>
              <Text style={styles.macroVal}>{scaled.carbs.toFixed(1)}</Text>
              <Text style={styles.macroLbl}>carbs g</Text>
            </View>
            <View style={styles.macroCell}>
              <Text style={styles.macroVal}>{scaled.fat.toFixed(1)}</Text>
              <Text style={styles.macroLbl}>fat g</Text>
            </View>
          </View>
          {scaled.fiber > 0.05 ? (
            <Text style={styles.fiberLine}>
              Fiber {scaled.fiber.toFixed(1)} g · {scaled.grams.toFixed(0)} g total
            </Text>
          ) : (
            <Text style={styles.fiberLineMuted}>{scaled.grams.toFixed(0)} g total weight</Text>
          )}
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => onPrimary()}
        disabled={submitting || !scaled}
        style={({ pressed }) => [
          styles.primaryBtn,
          (submitting || !scaled) && styles.primaryBtnDisabled,
          pressed && !submitting && scaled && styles.primaryBtnPressed,
        ]}
      >
        <Icon name={primaryIcon} size={20} color={colors.surface} />
        <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
      </Pressable>

      {secondaryLabel && onSecondary ? (
        <Pressable accessibilityRole="button" onPress={onSecondary} style={styles.secondary}>
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  detailCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  detailBrand: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  portionStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingBottom: 4,
  },
  portionChip: {
    maxWidth: 140,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: INPUT_BG,
  },
  portionChipOn: {
    borderColor: MEAL_PRIMARY,
    backgroundColor: colors.primarySoft,
  },
  portionChipPressed: {
    opacity: 0.9,
  },
  portionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  portionChipTextOn: {
    color: MEAL_PRIMARY,
  },
  portionGrams: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  servingInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    color: colors.textPrimary,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 8,
  },
  macroCell: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 0,
    padding: 10,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
  },
  macroVal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  macroLbl: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  fiberLine: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  fiberLineMuted: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    opacity: 0.8,
  },
  primaryBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: MEAL_PRIMARY,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
  secondary: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: MEAL_PRIMARY,
  },
});
