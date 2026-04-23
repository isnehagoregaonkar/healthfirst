import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppLoadingSpinner } from '../../components/feedback/AppLoadingSpinner';
import {
  Screen,
  SCREEN_HORIZONTAL_PADDING,
} from '../../components/layout/Screen';
import { ScreenTopCard } from '../../components/screenTop';
import type {
  LogMealItemPayload,
  MealItemRow,
  MealType,
} from '../../services/meals';
import { colors } from '../../theme/tokens';
import { formatDayShort, isSameLocalDay } from '../water/waterDayUtils';
import { AddMealActions } from './components/AddMealActions';
import { MealAddFoodModal } from './components/MealAddFoodModal';
import { MealCalorieProfileModal } from './components/MealCalorieProfileModal';
import { MealDaySummaryCard } from './components/MealDaySummaryCard';
import { MealTypeSection } from './components/MealTypeSection';
import { useMealCalorieTarget } from './hooks/useMealCalorieTarget';
import { useMealLogScreen } from './hooks/useMealLogScreen';
import { MEAL_TYPE_ORDER } from './mealConstants';
import { MEAL_PRIMARY } from './mealUiTheme';

export function MealTrackingScreen() {
  const {
    selectedDay,
    setSelectedDay,
    initialLoading,
    dayLoading,
    refreshing,
    error,
    meals,
    grouped,
    totalCalories,
    dayMacroTotals,
    creatingMealType,
    itemSubmitting,
    refresh,
    startMeal,
    submitFoodItem,
    updateFoodItem,
    confirmRemoveFoodItem,
    confirmRemoveEmptyMeal,
    deletingItemId,
    deletingMealId,
    clearError,
  } = useMealLogScreen();

  const { profile, suggestedKcal, macroTargets, bmi, updateProfile } =
    useMealCalorieTarget();

  const [foodModalMealId, setFoodModalMealId] = useState<string | null>(null);
  const [foodModalItemId, setFoodModalItemId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const isViewingToday = useMemo(
    () => isSameLocalDay(selectedDay, new Date()),
    [selectedDay],
  );
  const selectedDayLabel = useMemo(
    () => formatDayShort(selectedDay),
    [selectedDay],
  );

  const foodModalMeal = useMemo(
    () =>
      foodModalMealId
        ? meals.find(m => m.id === foodModalMealId) ?? null
        : null,
    [meals, foodModalMealId],
  );

  const foodModalEditingItem = useMemo((): MealItemRow | null => {
    if (!foodModalMeal || !foodModalItemId) {
      return null;
    }
    return foodModalMeal.items.find(i => i.id === foodModalItemId) ?? null;
  }, [foodModalMeal, foodModalItemId]);

  const closeFoodModal = useCallback(() => {
    setFoodModalMealId(null);
    setFoodModalItemId(null);
  }, []);

  const openMealSheet = useCallback((mealId: string, itemId: string | null) => {
    setFoodModalMealId(mealId);
    setFoodModalItemId(itemId);
  }, []);

  const handleMealTypePress = useCallback(
    async (mealType: MealType) => {
      const id = await startMeal(mealType);
      if (id) {
        setFoodModalMealId(id);
        setFoodModalItemId(null);
      }
    },
    [startMeal],
  );

  const handleSubmitAddFood = useCallback(
    async (item: LogMealItemPayload) => {
      if (!foodModalMealId) {
        return 'No meal selected.';
      }
      return submitFoodItem(foodModalMealId, item);
    },
    [foodModalMealId, submitFoodItem],
  );

  const handleSubmitEditFood = useCallback(
    async (itemId: string, item: LogMealItemPayload) => {
      const err = await updateFoodItem(itemId, item);
      if (!err) {
        closeFoodModal();
      }
      return err;
    },
    [updateFoodItem, closeFoodModal],
  );

  const switchModalToAddFood = useCallback(() => {
    setFoodModalItemId(null);
  }, []);

  return (
    <Screen
      applyTopSafeArea={false}
      applyBottomSafeArea={false}
      backgroundColor={colors.background}
    >
      <View style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          {initialLoading ? (
            <View style={styles.loading}>
              <AppLoadingSpinner
                title="Loading meals…"
                subtitle="Fetching this day"
              />
            </View>
          ) : (
            <ScrollView
              style={styles.scrollFlex}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => refresh().catch(() => {})}
                  tintColor={MEAL_PRIMARY}
                  colors={[MEAL_PRIMARY]}
                />
              }
            >
              {error ? (
                <Pressable
                  accessibilityRole="alert"
                  onPress={clearError}
                  style={({ pressed }) => [
                    styles.errorBanner,
                    pressed && styles.errorPressed,
                  ]}
                >
                  <Icon
                    name="alert-circle-outline"
                    size={22}
                    color={colors.error}
                  />
                  <View style={styles.errorTextCol}>
                    <Text style={styles.errorTitle}>{error}</Text>
                    <Text style={styles.errorHint}>Tap to dismiss</Text>
                  </View>
                </Pressable>
              ) : null}

              <ScreenTopCard
                mode="date"
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                stripScope="scrollablePast"
                accentColor={MEAL_PRIMARY}
              />

              {!isViewingToday ? (
                <Text style={styles.pastHint}>
                  Viewing {selectedDayLabel} — you can still log meals for this
                  day.
                </Text>
              ) : null}

              <MealDaySummaryCard
                dayLabel={isViewingToday ? 'Today' : selectedDayLabel}
                totalCalories={totalCalories}
                macros={dayMacroTotals}
                suggestedKcal={suggestedKcal}
                macroTargets={macroTargets}
                bmi={bmi}
                dayLoading={dayLoading}
                onPressAdjustTargets={() => setProfileModalOpen(true)}
              />

              <AddMealActions
                creatingMealType={creatingMealType}
                onAddMeal={handleMealTypePress}
              />

              {MEAL_TYPE_ORDER.map(type => (
                <MealTypeSection
                  key={type}
                  mealType={type}
                  meals={grouped[type]}
                  highlightedMealId={foodModalMealId}
                  highlightedItemId={foodModalItemId}
                  deletingItemId={deletingItemId}
                  deletingMealId={deletingMealId}
                  onOpenMealSheet={openMealSheet}
                  onRemoveItem={confirmRemoveFoodItem}
                  onRemoveEmptyMeal={confirmRemoveEmptyMeal}
                />
              ))}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>

      <MealAddFoodModal
        visible={foodModalMealId !== null}
        meal={foodModalMeal}
        editingItem={foodModalEditingItem}
        submitting={itemSubmitting}
        onClose={closeFoodModal}
        onSubmitAdd={handleSubmitAddFood}
        onSubmitEdit={handleSubmitEditFood}
        onSwitchToAddFood={switchModalToAddFood}
      />

      <MealCalorieProfileModal
        visible={profileModalOpen}
        profile={profile}
        onClose={() => setProfileModalOpen(false)}
        onSave={updateProfile}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 4,
    paddingBottom: 28,
  },
  pastHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorPressed: {
    opacity: 0.92,
  },
  errorTextCol: {
    flex: 1,
    minWidth: 0,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
    lineHeight: 21,
  },
  errorHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
