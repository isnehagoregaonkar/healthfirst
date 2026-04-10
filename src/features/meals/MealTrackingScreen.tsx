import React from 'react';
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
import { Screen } from '../../components/layout/Screen';
import { colors } from '../../theme/tokens';
import { MEAL_PRIMARY, MEAL_PRIMARY_DEEP } from './mealUiTheme';
import { MEAL_TYPE_ORDER } from './mealConstants';
import { AddFoodItemForm } from './components/AddFoodItemForm';
import { AddMealActions } from './components/AddMealActions';
import { MealDaySummaryCard } from './components/MealDaySummaryCard';
import { MealTypeSection } from './components/MealTypeSection';
import { useMealLogScreen } from './hooks/useMealLogScreen';

export function MealTrackingScreen() {
  const {
    loading,
    refreshing,
    error,
    grouped,
    totalCalories,
    activeMealId,
    activeMeal,
    creatingMealType,
    itemSubmitting,
    refresh,
    startMeal,
    setActiveMealId,
    submitFoodItem,
    clearError,
  } = useMealLogScreen();

  return (
    <Screen applyTopSafeArea={false} backgroundColor={colors.background}>
      <View style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          {loading ? (
            <View style={styles.loading}>
              <View style={styles.loadingOrb}>
                <ActivityIndicator size="large" color={MEAL_PRIMARY} />
              </View>
              <Text style={styles.loadingTitle}>Plating your meals…</Text>
              <Text style={styles.loadingText}>Fetching today&apos;s log</Text>
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
              <View style={styles.screenIntro}>
                <Text style={styles.screenEyebrow}>Meal log</Text>
                <Text style={styles.screenTitle}>Fuel your day</Text>
                <Text style={styles.screenSub}>Color-coded by meal type — tap to focus, then add foods.</Text>
              </View>

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

              <MealDaySummaryCard totalCalories={totalCalories} />

              <AddMealActions creatingMealType={creatingMealType} onAddMeal={startMeal} />

              <View style={styles.dividerLabelRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Your day</Text>
                <View style={styles.dividerLine} />
              </View>

              {MEAL_TYPE_ORDER.map((type) => (
                <MealTypeSection
                  key={type}
                  mealType={type}
                  meals={grouped[type]}
                  activeMealId={activeMealId}
                  onSelectMeal={setActiveMealId}
                />
              ))}

              <View style={styles.formWrap}>
                <AddFoodItemForm activeMeal={activeMeal} submitting={itemSubmitting} onSubmit={submitFoodItem} />
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
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
    paddingTop: 10,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  screenIntro: {
    marginBottom: 20,
  },
  screenEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: MEAL_PRIMARY_DEEP,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  screenTitle: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.8,
  },
  screenSub: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 22,
    maxWidth: 340,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
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
  formWrap: {
    marginTop: 4,
  },
});
