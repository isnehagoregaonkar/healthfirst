import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MealWithItems } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { AddFoodItemForm } from './AddFoodItemForm';

type MealAddFoodModalProps = Readonly<{
  visible: boolean;
  meal: MealWithItems | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (name: string, quantity: string, calories: string) => Promise<string | null>;
}>;

export function MealAddFoodModal({
  visible,
  meal,
  submitting,
  onClose,
  onSubmit,
}: MealAddFoodModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.scrim} accessibilityLabel="Dismiss" onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add foods</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            >
              <Icon name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          {meal ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formScroll}
            >
              <AddFoodItemForm
                activeMeal={meal}
                submitting={submitting}
                onSubmit={onSubmit}
                variant="modal"
              />
            </ScrollView>
          ) : (
            <View style={styles.fallback}>
              <ActivityIndicatorPlaceholder />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ActivityIndicatorPlaceholder() {
  return (
    <View style={styles.fallbackInner}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.fallbackText}>Preparing…</Text>
    </View>
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
    paddingBottom: 28,
    maxHeight: '92%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  grabberWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 12,
    marginRight: -4,
  },
  closeBtnPressed: {
    backgroundColor: colors.background,
    opacity: 0.9,
  },
  fallback: {
    minHeight: 120,
    justifyContent: 'center',
  },
  fallbackInner: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  fallbackText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  formScroll: {
    paddingBottom: 12,
  },
});
