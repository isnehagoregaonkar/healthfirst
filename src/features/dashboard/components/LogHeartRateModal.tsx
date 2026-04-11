import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../../../theme/tokens';
import { DASH_HEART, DASH_MUTED, DASH_SLATE } from '../dashboardTokens';
import { useLogHeartRateForm } from '../hooks/useLogHeartRateForm';

type LogHeartRateModalProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  onLogged: () => void;
}>;

export function LogHeartRateModal({
  visible,
  onClose,
  onLogged,
}: LogHeartRateModalProps) {
  const { bpm, setBpm, err, busy, submit } = useLogHeartRateForm(
    visible,
    onClose,
    onLogged,
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.modalScrim}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View style={styles.modalCenter} pointerEvents="box-none">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log heart rate</Text>
            <Text style={styles.modalHint}>Resting BPM (35–220)</Text>
            <TextInput
              value={bpm}
              onChangeText={setBpm}
              keyboardType="number-pad"
              placeholder="e.g. 68"
              placeholderTextColor={DASH_MUTED}
              style={styles.modalInput}
            />
            {err ? <Text style={styles.modalErr}>{err}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable onPress={onClose} style={styles.modalGhost}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => submit().catch(() => {})}
                disabled={busy}
                style={[
                  styles.modalPrimary,
                  busy && styles.modalPrimaryDisabled,
                ]}
              >
                <Text style={styles.modalPrimaryText}>
                  {busy ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  modalScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCenter: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DASH_SLATE,
  },
  modalHint: {
    marginTop: 6,
    fontSize: 13,
    color: DASH_MUTED,
    fontWeight: '600',
  },
  modalInput: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: DASH_SLATE,
    backgroundColor: '#F8FAFC',
  },
  modalErr: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
  },
  modalGhost: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalGhostText: {
    fontSize: 16,
    fontWeight: '700',
    color: DASH_MUTED,
  },
  modalPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: DASH_HEART,
  },
  modalPrimaryDisabled: {
    opacity: 0.5,
  },
  modalPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
});
