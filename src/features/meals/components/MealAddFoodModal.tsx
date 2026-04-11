import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { LogMealItemPayload, MealItemRow, MealWithItems } from '../../../services/meals';
import { colors } from '../../../theme/tokens';
import { AddFoodItemForm } from './AddFoodItemForm';

type MealAddFoodModalProps = Readonly<{
  visible: boolean;
  meal: MealWithItems | null;
  editingItem: MealItemRow | null;
  submitting: boolean;
  onClose: () => void;
  onSubmitAdd: (item: LogMealItemPayload) => Promise<string | null>;
  onSubmitEdit: (itemId: string, item: LogMealItemPayload) => Promise<string | null>;
  onSwitchToAddFood: () => void;
}>;

export function MealAddFoodModal({
  visible,
  meal,
  editingItem,
  submitting,
  onClose,
  onSubmitAdd,
  onSubmitEdit,
  onSwitchToAddFood,
}: MealAddFoodModalProps) {
  const { height: windowH } = useWindowDimensions();
  const sheetLayout = useMemo(() => {
    const target = Math.round(windowH * 0.8);
    const cap = Math.round(windowH * 0.92);
    return { height: Math.min(target, cap) };
  }, [windowH]);

  const headerTitle = editingItem ? 'Edit food' : 'Add meal';

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
        <Pressable
          style={styles.scrim}
          accessibilityLabel="Dismiss"
          onPress={onClose}
        />
        <View style={[styles.sheet, { height: sheetLayout.height }]}>
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.closeBtnPressed,
              ]}
            >
              <Icon name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          {meal ? (
            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formScroll}
            >
              <AddFoodItemForm
                activeMeal={meal}
                editingItem={editingItem}
                submitting={submitting}
                onSubmitAdd={onSubmitAdd}
                onSubmitEdit={onSubmitEdit}
                onSwitchToAddFood={onSwitchToAddFood}
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
    width: '100%',
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
    flex: 1,
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
  scroll: {
    flex: 1,
  },
  formScroll: {
    paddingBottom: 12,
  },
});
