import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { colors } from '../../theme/tokens';
import { MEAL_PRIMARY } from '../meals/mealUiTheme';
import { useGoalsScreen } from './hooks/useGoalsScreen';

const INPUT_BG = '#F3F4F6';

type GoalInputCardProps = Readonly<{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType: 'number-pad' | 'decimal-pad';
  hint: string;
}>;

function GoalInputCard({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  hint,
}: GoalInputCardProps) {
  return (
    <View style={styles.goalCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={styles.input}
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={Keyboard.dismiss}
      />
      <Text style={styles.fieldHint}>{hint}</Text>
    </View>
  );
}

export function GoalsScreen() {
  const {
    loading,
    saving,
    error,
    save,
    applyDefaults,
    exerciseMinutes,
    setExerciseMinutes,
    calorieIntake,
    setCalorieIntake,
    calorieBurn,
    setCalorieBurn,
    waterIntakeMl,
    setWaterIntakeMl,
    targetWeightKg,
    setTargetWeightKg,
    waterLiters,
  } = useGoalsScreen();

  const handleSave = useCallback(async () => {
    const r = await save();
    if (!r.ok) {
      Alert.alert('Check goals', r.message);
      return;
    }
    Alert.alert('Saved', 'Your goal settings have been updated.');
  }, [save]);

  const handleDefaults = useCallback(async () => {
    await applyDefaults();
    Alert.alert('Defaults applied', 'Goals were recalculated from your current profile.');
  }, [applyDefaults]);

  if (loading) {
    return (
      <Screen applyTopSafeArea={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading goals…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen applyTopSafeArea={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headerTitle}>Goals</Text>
          <Text style={styles.headerSub}>
            Set your daily targets. If left unset, defaults are based on your current weight and height profile.
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <GoalInputCard
            label="Exercise minutes goal"
            value={exerciseMinutes}
            onChangeText={setExerciseMinutes}
            placeholder="30"
            keyboardType="number-pad"
            hint="Target active minutes each day."
          />

          <GoalInputCard
            label="Calorie intake goal (kcal)"
            value={calorieIntake}
            onChangeText={setCalorieIntake}
            placeholder="2000"
            keyboardType="number-pad"
            hint="Daily calories to consume."
          />

          <GoalInputCard
            label="Burn calories goal (kcal)"
            value={calorieBurn}
            onChangeText={setCalorieBurn}
            placeholder="250"
            keyboardType="number-pad"
            hint="Estimated calories to burn through activity."
          />

          <GoalInputCard
            label="Water intake goal (ml)"
            value={waterIntakeMl}
            onChangeText={setWaterIntakeMl}
            placeholder="2500"
            keyboardType="number-pad"
            hint={
              waterLiters != null
                ? `Current: ${waterLiters.toFixed(1)} L per day`
                : 'Daily water target'
            }
          />

          <GoalInputCard
            label="Target weight (kg)"
            value={targetWeightKg}
            onChangeText={setTargetWeightKg}
            placeholder="68"
            keyboardType="decimal-pad"
            hint="Long-term weight goal."
          />

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                handleDefaults().catch(() => {});
              }}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostPressed]}
            >
              <Text style={styles.ghostText}>Use defaults</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => {
                handleSave().catch(() => {});
              }}
              style={({ pressed }) => [
                styles.saveBtn,
                saving && styles.saveDisabled,
                pressed && !saving && styles.savePressed,
              ]}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save goals'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  errorBanner: {
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
  goalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  fieldHint: {
    marginTop: 7,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  ghostBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  ghostPressed: {
    opacity: 0.88,
  },
  ghostText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: MEAL_PRIMARY,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveDisabled: {
    opacity: 0.55,
  },
  savePressed: {
    opacity: 0.92,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
});
