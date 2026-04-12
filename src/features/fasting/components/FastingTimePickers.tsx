import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/tokens';
import type { FastingTimePickerTarget } from '../fastingTypes';

type FastingTimePickersProps = Readonly<{
  pickerTarget: FastingTimePickerTarget;
  iosDraft: Date;
  setIosDraft: (d: Date) => void;
  pickerTitle: string;
  onAndroidTimePicked: (date: Date) => void;
  onAndroidDismiss: () => void;
  onIosSave: () => void;
  onIosCancel: () => void;
}>;

export function FastingTimePickers({
  pickerTarget,
  iosDraft,
  setIosDraft,
  pickerTitle,
  onAndroidTimePicked,
  onAndroidDismiss,
  onIosSave,
  onIosCancel,
}: FastingTimePickersProps) {
  const iosOpen = Platform.OS === 'ios' && pickerTarget !== null;

  return (
    <>
      {pickerTarget !== null && Platform.OS === 'android' ? (
        <DateTimePicker
          value={iosDraft}
          mode="time"
          display="default"
          onValueChange={(_, date) => onAndroidTimePicked(date)}
          onDismiss={onAndroidDismiss}
        />
      ) : null}

      <Modal
        visible={iosOpen}
        transparent
        animationType="fade"
        onRequestClose={onIosCancel}
      >
        <Pressable style={styles.modalBackdrop} onPress={onIosCancel}>
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>
            <DateTimePicker
              value={iosDraft}
              mode="time"
              display="spinner"
              onValueChange={(_, date) => setIosDraft(date)}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={onIosCancel}
                style={({ pressed }) => [styles.modalBtn, pressed && styles.pressed]}
              >
                <Text style={styles.modalBtnTextMuted}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onIosSave}
                style={({ pressed }) => [styles.modalBtn, pressed && styles.pressed]}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
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
