import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {
  MealCalorieProfile,
  MealCalorieSex,
} from '../../../services/mealCalorieTarget';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY } from '../mealUiTheme';

type MealCalorieProfileModalProps = Readonly<{
  visible: boolean;
  profile: MealCalorieProfile | null;
  onClose: () => void;
  onSave: (profile: MealCalorieProfile) => Promise<void>;
}>;

const INPUT_BG = '#F3F4F6';

export function MealCalorieProfileModal({
  visible,
  profile,
  onClose,
  onSave,
}: MealCalorieProfileModalProps) {
  const [weightKg, setWeightKg] = useState('');
  const [goalKg, setGoalKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<MealCalorieSex>('female');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && profile) {
      setWeightKg(String(profile.weightKg));
      setGoalKg(String(profile.goalWeightKg));
      setHeightCm(String(profile.heightCm));
      setAge(String(profile.age));
      setSex(profile.sex);
    }
  }, [visible, profile]);

  const handleSave = useCallback(async () => {
    const w = Number.parseFloat(weightKg.replace(',', '.'));
    const g = Number.parseFloat(goalKg.replace(',', '.'));
    const h = Number.parseFloat(heightCm.replace(',', '.'));
    const a = Number.parseInt(age.replace(/\s/g, ''), 10);
    if (!Number.isFinite(w) || w < 30 || w > 300) {
      Alert.alert(
        'Check weight',
        'Enter current weight between 30 and 300 kg.',
      );
      return;
    }
    if (!Number.isFinite(g) || g < 30 || g > 300) {
      Alert.alert('Check goal', 'Enter goal weight between 30 and 300 kg.');
      return;
    }
    if (!Number.isFinite(h) || h < 120 || h > 230) {
      Alert.alert('Check height', 'Enter height between 120 and 230 cm.');
      return;
    }
    if (!Number.isFinite(a) || a < 14 || a > 100) {
      Alert.alert('Check age', 'Enter age between 14 and 100.');
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    try {
      await onSave({
        weightKg: w,
        goalWeightKg: g,
        heightCm: h,
        age: a,
        sex,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [weightKg, goalKg, heightCm, age, sex, onSave, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Calorie target</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.iconBtnPressed,
              ]}
            >
              <Icon name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Text style={styles.blurb}>
            We estimate your suggested intake from weight, goal, height, age,
            and sex (Mifflin–St Jeor + activity). This isn&apos;t medical
            advice.
          </Text>

          <Text style={styles.label}>Current weight (kg)</Text>
          <TextInput
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="decimal-pad"
            placeholder="72"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Goal weight (kg)</Text>
          <TextInput
            value={goalKg}
            onChangeText={setGoalKg}
            keyboardType="decimal-pad"
            placeholder="68"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="decimal-pad"
            placeholder="170"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Age</Text>
          <TextInput
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="32"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Sex (for BMR)</Text>
          <View style={styles.sexRow}>
            {(['female', 'male'] as const).map(s => (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: sex === s }}
                onPress={() => setSex(s)}
                style={({ pressed }) => [
                  styles.seg,
                  sex === s && styles.segOn,
                  pressed && styles.segPressed,
                ]}
              >
                <Text style={[styles.segText, sex === s && styles.segTextOn]}>
                  {s === 'female' ? 'Female' : 'Male'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => handleSave().catch(() => {})}
            style={({ pressed }) => [
              styles.saveBtn,
              saving && styles.saveDisabled,
              pressed && !saving && styles.savePressed,
            ]}
          >
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    marginRight: -4,
  },
  iconBtnPressed: {
    backgroundColor: colors.background,
  },
  blurb: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sexRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  seg: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  segOn: {
    borderColor: MEAL_PRIMARY,
    backgroundColor: colors.primarySoft,
  },
  segPressed: {
    opacity: 0.9,
  },
  segText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segTextOn: {
    color: MEAL_PRIMARY,
  },
  dismissKeyboardBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
  },
  dismissKeyboardBtnPressed: {
    opacity: 0.9,
  },
  dismissKeyboardTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: MEAL_PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  saveBtn: {
    marginTop: 22,
    backgroundColor: MEAL_PRIMARY,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveDisabled: {
    opacity: 0.55,
  },
  savePressed: {
    opacity: 0.92,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
});
