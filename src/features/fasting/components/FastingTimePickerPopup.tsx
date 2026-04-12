import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/tokens';
import type { TimeOfDay } from '../fastingTypes';
import { FastingScrollTimePicker } from './FastingScrollTimePicker';

type FastingTimePickerPopupProps = Readonly<{
  visible: boolean;
  title: string;
  /** Current draft while the popup is open. */
  draft: Date;
  onDraftChange: (date: Date) => void;
  onSave: () => void;
  onCancel: () => void;
}>;

/**
 * Full-screen overlay (no nested `Modal`). Render inside the schedule `Modal` so
 * the wheels stay visible on Android/iOS; a second `Modal` often fails to stack.
 */
export function FastingTimePickerPopup({
  visible,
  title,
  draft,
  onDraftChange,
  onSave,
  onCancel,
}: FastingTimePickerPopupProps) {
  if (!visible) {
    return null;
  }

  const value: TimeOfDay = {
    hour: draft.getHours(),
    minute: draft.getMinutes(),
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      <Pressable
        style={[StyleSheet.absoluteFill, styles.dim]}
        onPress={onCancel}
        accessibilityLabel="Dismiss time picker"
      />
      <View style={styles.cardOuter} pointerEvents="box-none">
        <View style={styles.card}>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.pickerMinArea}>
            <FastingScrollTimePicker value={value} onChange={onDraftChange} />
          </View>
          <View style={styles.modalActions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.modalBtn, pressed && styles.pressed]}
            >
              <Text style={styles.modalBtnTextMuted}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              style={({ pressed }) => [styles.modalBtn, pressed && styles.pressed]}
            >
              <Text style={styles.modalBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 100,
    elevation: 24,
    justifyContent: 'center',
    padding: 24,
  },
  dim: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  cardOuter: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    // Android: draw above sibling ScrollView in the host modal
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  /** Reserve vertical space so the wheel viewport cannot collapse. */
  pickerMinArea: {
    minHeight: 216,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  modalBtnTextMuted: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.9,
  },
});
