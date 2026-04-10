import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import type { MealType } from '../../services/meals';
import { Screen } from '../../components/layout/Screen';
import { colors } from '../../theme/tokens';
import { formatDayShort, isSameLocalDay } from '../water/waterDayUtils';
import { MEAL_PRIMARY } from './mealUiTheme';
import { MEAL_TYPE_ORDER } from './mealConstants';
import { AddMealActions } from './components/AddMealActions';
import { MealAddFoodModal } from './components/MealAddFoodModal';
import { MealCalorieProfileModal } from './components/MealCalorieProfileModal';
import { MealDayStrip } from './components/MealDayStrip';
import { MealDaySummaryCard } from './components/MealDaySummaryCard';
import { MealTypeSection } from './components/MealTypeSection';
import { useMealCalorieTarget } from './hooks/useMealCalorieTarget';
import { useMealLogScreen } from './hooks/useMealLogScreen';

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
    creatingMealType,
    itemSubmitting,
    refresh,
    startMeal,
    submitFoodItem,
    clearError,
  } = useMealLogScreen();

  const { profile, suggestedKcal, updateProfile } = useMealCalorieTarget();

  const [foodModalMealId, setFoodModalMealId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const isViewingToday = useMemo(() => isSameLocalDay(selectedDay, new Date()), [selectedDay]);
  const selectedDayLabel = useMemo(() => formatDayShort(selectedDay), [selectedDay]);

  const foodModalMeal = useMemo(
    () => (foodModalMealId ? meals.find((m) => m.id === foodModalMealId) ?? null : null),
    [meals, foodModalMealId],
  );

  const closeFoodModal = useCallback(() => {
    setFoodModalMealId(null);
  }, []);

  const openFoodModalForMeal = useCallback((mealId: string) => {
    setFoodModalMealId(mealId);
  }, []);

  const handleMealTypePress = useCallback(
    async (mealType: MealType) => {
      const id = await startMeal(mealType);
      if (id) {
        setFoodModalMealId(id);
      }
    },
    [startMeal],
  );

  const handleSubmitFood = useCallback(
    async (name: string, quantity: string, calories: string) => {
      if (!foodModalMealId) {
        return 'No meal selected.';
      }
      return submitFoodItem(foodModalMealId, name, quantity, calories);
    },
    [foodModalMealId, submitFoodItem],
  );

  return (
    <Screen applyTopSafeArea={false} backgroundColor={colors.background}>
      <View style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          {initialLoading ? (
            <View style={styles.loading}>
              <View style={styles.loadingOrb}>
                <ActivityIndicator size="large" color={MEAL_PRIMARY} />
              </View>
              <Text style={styles.loadingTitle}>Loading meals…</Text>
              <Text style={styles.loadingText}>Fetching this day</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
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
                  style={({ pressed }) => [styles.errorBanner, pressed && styles.errorPressed]}
                >
                  <Icon name="alert-circle-outline" size={22} color={colors.error} />
                  <View style={styles.errorTextCol}>
                    <Text style={styles.errorTitle}>{error}</Text>
                    <Text style={styles.errorHint}>Tap to dismiss</Text>
                  </View>
                </Pressable>
              ) : null}

              <MealDayStrip selectedDay={selectedDay} onSelectDay={setSelectedDay} />

              {!isViewingToday ? (
                <Text style={styles.pastHint}>
                  Viewing {selectedDayLabel} — you can still log meals for this day.
                </Text>
              ) : null}

              <MealDaySummaryCard
                dayLabel={isViewingToday ? 'Today' : selectedDayLabel}
                totalCalories={totalCalories}
                suggestedKcal={suggestedKcal}
                dayLoading={dayLoading}
                onPressAdjustTargets={() => setProfileModalOpen(true)}
              />

              <AddMealActions creatingMealType={creatingMealType} onAddMeal={handleMealTypePress} />

              <View style={[styles.dividerLabelRow, styles.dividerAfterActions]}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Logged meals</Text>
                <View style={styles.dividerLine} />
              </View>

              {MEAL_TYPE_ORDER.map((type) => (
                <MealTypeSection
                  key={type}
                  mealType={type}
                  meals={grouped[type]}
                  highlightedMealId={foodModalMealId}
                  onSelectMeal={openFoodModalForMeal}
                />
              ))}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>

      <MealAddFoodModal
        visible={foodModalMealId !== null}
        meal={foodModalMeal}
        submitting={itemSubmitting}
        onClose={closeFoodModal}
        onSubmit={handleSubmitFood}
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
  loadingOrb: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${MEAL_PRIMARY}40`,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  loadingText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  pastHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  dividerAfterActions: {
    marginTop: 8,
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
  dividerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
