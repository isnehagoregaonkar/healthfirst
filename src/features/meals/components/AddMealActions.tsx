import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MealType } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_TYPE_ACCENTS, MEAL_TYPE_MCI, mealTypography } from '../mealUiTheme';
import { MEAL_TYPE_LABEL, MEAL_TYPE_ORDER } from '../mealConstants';

type AddMealActionsProps = Readonly<{
  creatingMealType: MealType | null;
  onAddMeal: (mealType: MealType) => void;
}>;

export function AddMealActions({ creatingMealType, onAddMeal }: AddMealActionsProps) {
  const anyCreating = creatingMealType !== null;

  return (
    <View style={styles.wrap}>
      <Text style={mealTypography.sectionEyebrow}>Quick start</Text>
      <Text style={mealTypography.sectionTitle}>Log a meal</Text>
      <Text style={[mealTypography.body, styles.hint]}>Pick a slot — then add foods in the card below.</Text>
      <View style={styles.grid}>
        {MEAL_TYPE_ORDER.map((type) => {
          const busy = creatingMealType === type;
          const a = MEAL_TYPE_ACCENTS[type];
          const icon = MEAL_TYPE_MCI[type];
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityLabel={`Log ${MEAL_TYPE_LABEL[type]}`}
              disabled={anyCreating}
              onPress={() => onAddMeal(type)}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: a.soft, borderColor: a.border },
                anyCreating && !busy && styles.tileDimmed,
                pressed && !anyCreating && styles.tilePressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={a.deep} style={styles.tileSpinner} />
              ) : (
                <>
                  <View style={[styles.iconBubble, { backgroundColor: `${a.primary}18` }]}>
                    <Icon name={icon} size={26} color={a.primary} />
                  </View>
                  <Text style={[styles.tileLabel, { color: a.deep }]}>{MEAL_TYPE_LABEL[type]}</Text>
                  <Text style={styles.tileSub}>New entry</Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 26,
  },
  hint: {
    marginBottom: 16,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 148,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    minHeight: 118,
    justifyContent: 'center',
  },
  tileDimmed: {
    opacity: 0.45,
  },
  tilePressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  tileSpinner: {
    marginVertical: 8,
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  tileSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
