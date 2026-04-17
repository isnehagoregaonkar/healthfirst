import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AuthScreenShell } from './ui/AuthScreenShell';
import { authFormStyles } from './ui/authFormStyles';
import { useForgotPasswordForm } from './hooks/useForgotPasswordForm';
import { colors } from '../../theme/tokens';

type ForgotPasswordScreenProps = Readonly<{
  onBackToLogin: () => void;
}>;

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const {
    email,
    setEmail,
    emailError,
    isSubmitting,
    submitError,
    submitSuccess,
    handleSendReset,
  } = useForgotPasswordForm();

  return (
    <AuthScreenShell
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerPrompt}>Remembered your password? </Text>
          <Pressable onPress={onBackToLogin}>
            <Text style={styles.footerLink}>Log in</Text>
          </Pressable>
        </View>
      }
    >
      <View style={authFormStyles.inputGroup}>
        <Text style={authFormStyles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[authFormStyles.input, emailError && authFormStyles.inputError]}
        />
        {emailError ? <Text style={authFormStyles.errorText}>Email is required.</Text> : null}
      </View>

      <Pressable style={authFormStyles.primaryButton} onPress={handleSendReset}>
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={authFormStyles.primaryButtonText}>Send reset link</Text>
        )}
      </Pressable>

      {submitError ? <Text style={authFormStyles.submitErrorText}>{submitError}</Text> : null}
      {submitSuccess ? <Text style={styles.submitSuccessText}>{submitSuccess}</Text> : null}

      <Pressable style={styles.backRow} onPress={onBackToLogin}>
        <Text style={styles.backText}>Back to login</Text>
      </Pressable>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  submitSuccessText: {
    marginTop: 10,
    color: colors.primary,
    fontSize: 12,
    textAlign: 'center',
  },
  backRow: {
    marginTop: 14,
    alignItems: 'center',
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  footerRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerPrompt: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
