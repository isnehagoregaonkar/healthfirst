import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRegisterForm } from './hooks/useRegisterForm';
import { authFormStyles } from './ui/authFormStyles';
import { AuthScreenShell } from './ui/AuthScreenShell';
import { colors } from '../../theme/tokens';

type RegisterScreenProps = Readonly<{
  onNavigateToLogin: () => void;
}>;

export function RegisterScreen({ onNavigateToLogin }: RegisterScreenProps) {
  const {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    nameError,
    emailError,
    passwordError,
    isSubmitting,
    submitError,
    submitSuccess,
    handleRegister,
  } = useRegisterForm();

  return (
    <AuthScreenShell
      title="Create account"
      subtitle="Sign up to start your health journey."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerPrompt}>Already have an account? </Text>
          <Pressable onPress={onNavigateToLogin}>
            <Text style={styles.footerLink}>Log in</Text>
          </Pressable>
        </View>
      }
    >
      <View style={authFormStyles.inputGroup}>
        <Text style={authFormStyles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
          style={[authFormStyles.input, nameError && authFormStyles.inputError]}
        />
        {nameError ? <Text style={authFormStyles.errorText}>Name is required.</Text> : null}
      </View>

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
          placeholder="Choose a password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          style={[authFormStyles.input, passwordError && authFormStyles.inputError]}
        />
        {passwordError ? <Text style={authFormStyles.errorText}>Password is required.</Text> : null}
      </View>

      <Pressable style={authFormStyles.primaryButton} onPress={handleRegister}>
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={authFormStyles.primaryButtonText}>Register</Text>
        )}
      </Pressable>
      {submitError ? <Text style={authFormStyles.submitErrorText}>{submitError}</Text> : null}
      {submitSuccess ? <Text style={styles.submitSuccessText}>{submitSuccess}</Text> : null}
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
