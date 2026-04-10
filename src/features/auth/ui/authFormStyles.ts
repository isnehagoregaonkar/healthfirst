import { StyleSheet } from 'react-native';
import { colors } from '../../../theme/tokens';

export const authFormStyles = StyleSheet.create({
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 6,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    marginTop: 6,
    color: colors.error,
    fontSize: 12,
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  submitErrorText: {
    marginTop: 10,
    color: colors.error,
    fontSize: 12,
    textAlign: 'center',
  },
});
