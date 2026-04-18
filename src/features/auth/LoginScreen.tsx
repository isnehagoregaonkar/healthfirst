import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLoginForm } from './hooks/useLoginForm';
import { authFormStyles } from './ui/authFormStyles';
import { AuthScreenShell } from './ui/AuthScreenShell';
import { colors } from '../../theme/tokens';

type LoginScreenProps = Readonly<{
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
}>;

export function LoginScreen({
  onNavigateToRegister,
  onNavigateToForgotPassword,
}: LoginScreenProps) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    emailError,
    passwordError,
    isSubmitting,
    submitError,
    handleLogin,
  } = useLoginForm();

  return (
    <AuthScreenShell
      title="Welcome Back"
      subtitle="Sign in to continue your health journey."
      footer={
        onNavigateToRegister ? (
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Don't have an account? </Text>
            <Pressable onPress={onNavigateToRegister}>
              <Text style={styles.registerLink}>Register</Text>
            </Pressable>
          </View>
        ) : null
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

      <View style={authFormStyles.inputGroup}>
        <Text style={authFormStyles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          style={[authFormStyles.input, passwordError && authFormStyles.inputError]}
        />
        {passwordError ? <Text style={authFormStyles.errorText}>Password is required.</Text> : null}
      </View>

      <Pressable style={authFormStyles.primaryButton} onPress={handleLogin}>
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={authFormStyles.primaryButtonText}>Log In</Text>
        )}
      </Pressable>
      {submitError ? <Text style={authFormStyles.submitErrorText}>{submitError}</Text> : null}

      <Pressable
        style={styles.secondaryAction}
        onPress={onNavigateToForgotPassword}
      >
        <Text style={styles.secondaryActionText}>Forgot password?</Text>
      </Pressable>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  secondaryAction: {
    marginTop: 14,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  registerRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerPrompt: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
