import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { FastingScrollTimePicker } from '../fasting/components/FastingScrollTimePicker';
import type { TimeOfDay } from '../fasting/fastingTypes';

function toDate(t: TimeOfDay): Date {
  const d = new Date();
  d.setHours(t.hour, t.minute, 0, 0);
  return d;
}

function fromDate(d: Date): TimeOfDay {
  return { hour: d.getHours(), minute: d.getMinutes() };
}

type ReminderTimePickerModalProps = Readonly<{
  visible: boolean;
  title: string;
  initial: TimeOfDay;
  onSave: (t: TimeOfDay) => void;
  onCancel: () => void;
}>;

export function ReminderTimePickerModal({
  visible,
  title,
  initial,
  onSave,
  onCancel,
}: ReminderTimePickerModalProps) {
  const [draft, setDraft] = useState(() => toDate(initial));

  useEffect(() => {
    if (visible) {
      setDraft(toDate(initial));
    }
  }, [visible, initial.hour, initial.minute]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.wrap} pointerEvents="box-none">
        <Pressable
          style={[StyleSheet.absoluteFill, styles.dim]}
          onPress={onCancel}
          accessibilityLabel="Dismiss"
        />
        <View style={styles.cardOuter} pointerEvents="box-none">
          <View style={styles.card}>
            <Text style={styles.modalTitle}>{title}</Text>
            <View style={styles.pickerMinArea}>
              <FastingScrollTimePicker
                value={fromDate(draft)}
                onChange={setDraft}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => [styles.modalBtn, pressed && styles.pressed]}
              >
                <Text style={styles.modalBtnTextMuted}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => onSave(fromDate(draft))}
                style={({ pressed }) => [styles.modalBtn, pressed && styles.pressed]}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  pickerMinArea: {
    minHeight: 216,
    justifyContent: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.75,
  },
  modalBtnTextMuted: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
});
