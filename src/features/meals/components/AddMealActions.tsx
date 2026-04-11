import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MealType } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { MEAL_TYPE_LABEL, MEAL_TYPE_ORDER } from '../mealConstants';
import { MEAL_TYPE_ACCENTS, MEAL_TYPE_MCI } from '../mealUiTheme';

type AddMealActionsProps = Readonly<{
  creatingMealType: MealType | null;
  onAddMeal: (mealType: MealType) => void;
}>;

/** Single horizontal row — avoids flexWrap + flexGrow overlap bugs inside ScrollView. */
export function AddMealActions({
  creatingMealType,
  onAddMeal,
}: AddMealActionsProps) {
  const anyCreating = creatingMealType !== null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Add Meal</Text>
      <View style={styles.row}>
        {MEAL_TYPE_ORDER.map(type => {
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
                styles.btn,
                { backgroundColor: a.soft, borderColor: a.border },
                anyCreating && !busy && styles.btnDimmed,
                pressed && !anyCreating && styles.btnPressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={a.deep} />
              ) : (
                <>
                  <Icon name={icon} size={20} color={a.primary} />
                  <Text
                    style={[styles.btnLabel, { color: a.deep }]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
                    {MEAL_TYPE_LABEL[type]}
                  </Text>
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
    paddingTop: 4,
    marginBottom: 22,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  btn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  btnDimmed: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  btnLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 13,
  },
});
