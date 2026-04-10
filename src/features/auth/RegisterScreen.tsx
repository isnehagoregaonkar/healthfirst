import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { signUp } from '../../services/auth';
import { colors } from '../../theme/tokens';

type RegisterScreenProps = Readonly<{
  onNavigateToLogin: () => void;
}>;

export function RegisterScreen({ onNavigateToLogin }: RegisterScreenProps) {
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const cardWidth = useMemo(() => {
    if (width >= 900) {
      return 520;
    }
    if (width >= 600) {
      return Math.min(width * 0.72, 460);
    }
    return width - 32;
  }, [width]);

  const nameError = showErrors && name.trim().length === 0;
  const emailError = showErrors && email.trim().length === 0;
  const passwordError = showErrors && password.trim().length === 0;

  const handleRegister = async () => {
    setShowErrors(true);
    setSubmitError('');
    setSubmitSuccess('');

    if (
      name.trim().length === 0 ||
      email.trim().length === 0 ||
      password.trim().length === 0
    ) {
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(name.trim(), email.trim(), password);
    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setSubmitSuccess('Registration successful. You can continue in the app.');
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { width: cardWidth }]}>
            <Image
              source={require('../../assets/logo/health-first.png')}
              resizeMode="contain"
              style={styles.logo}
            />

            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              Sign up to start your health journey.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                style={[styles.input, nameError && styles.inputError]}
              />
              {nameError ? (
                <Text style={styles.errorText}>Name is required.</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, emailError && styles.inputError]}
              />
              {emailError ? (
                <Text style={styles.errorText}>Email is required.</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Choose a password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                style={[styles.input, passwordError && styles.inputError]}
              />
              {passwordError ? (
                <Text style={styles.errorText}>Password is required.</Text>
              ) : null}
            </View>

            <Pressable style={styles.primaryButton} onPress={handleRegister}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Register</Text>
              )}
            </Pressable>
            {submitError ? <Text style={styles.submitErrorText}>{submitError}</Text> : null}
            {submitSuccess ? (
              <Text style={styles.submitSuccessText}>{submitSuccess}</Text>
            ) : null}

            <View style={styles.footerRow}>
              <Text style={styles.footerPrompt}>Already have an account? </Text>
              <Pressable onPress={onNavigateToLogin}>
                <Text style={styles.footerLink}>Log in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  logo: {
    width: 160,
    height: 160,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
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
